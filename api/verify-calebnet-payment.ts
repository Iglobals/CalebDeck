import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import axios from 'axios';

// Init Firebase Admin
if (getApps().length === 0) {
    const projectId = process.env.FB_SA_PROJECT_ID;
    const clientEmail = process.env.FB_SA_CLIENT_EMAIL;
    let privateKey = process.env.FB_SA_PRIVATE_KEY || '';
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
        initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    }
}

const db = getApps().length > 0 ? getFirestore() : null;

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';
const VALID_NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];
const VTPASS_TIMEOUT = 15000; // 15 seconds

function generateRequestId(reference: string) {
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const cleanRef = reference.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    return `${ts}${cleanRef}`;
}

function isValidNigerianPhone(phone: string): boolean {
    return /^0[789][01]\d{8}$/.test(phone);
}

function mapVTpassError(code: string, responseDescription?: string): string {
    switch (code) {
        case '000': return 'Success';
        case '099': return 'Transaction pending with provider';
        case '016': return 'Transaction failed — insufficient provider balance';
        case '009': return 'Duplicate transaction';
        case '010': return 'Invalid variation code or plan';
        case '014': return 'Invalid phone number';
        case '015': return 'Phone number and network mismatch';
        case '030': return 'Service temporarily unavailable';
        case '040': return 'Temporarily suspended — try again later';
        default: return responseDescription || `Provider error (${code})`;
    }
}

// Fire-and-forget: Send push notification to admin
async function notifyAdmin(order: any, status: string) {
    try {
        if (!db) return;
        // Get admin FCM tokens from users collection (matching existing pattern)
        const adminsSnapshot = await db.collection('users').where('role', '==', 'ADMIN').get();
        const tokens: string[] = [];
        adminsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                tokens.push(...data.fcmTokens);
            }
        });

        if (tokens.length === 0) return;

        const statusEmoji = status === 'SUCCESSFUL' ? '✅' : status === 'PENDING_PROVIDER' ? '⏳' : '❌';
        const message = {
            notification: {
                title: `${statusEmoji} CalebNet: ₦${(order.amountPaid || 0).toLocaleString()} ${order.network} ${order.type}`,
                body: `Phone: ${order.phoneNumber} | ${order.planName || 'Airtime'} | Status: ${status}`,
            },
            data: { link: '/admin/calebnet' },
            tokens,
        };

        await getMessaging().sendEachForMulticast(message);
    } catch (err) {
        // Fire-and-forget — don't let push failures break the flow
        console.warn('[CalebNet] Push notification failed (non-blocking):', err);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        if (!db) {
            return res.status(500).json({ error: 'Server configuration error. Contact support.' });
        }

        const { reference, orderData } = req.body;

        // ─── Validation ───────────────────────────────────────────────
        if (!reference || typeof reference !== 'string') {
            return res.status(400).json({ error: 'Payment reference is required' });
        }
        if (!orderData || typeof orderData !== 'object') {
            return res.status(400).json({ error: 'Order data is required' });
        }

        const { network, type, phoneNumber, planId, planName, amountPaid } = orderData;

        if (!network || !VALID_NETWORKS.includes(network.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid network. Must be MTN, Airtel, Glo, or 9Mobile.' });
        }
        if (!type || !['data', 'airtime'].includes(type)) {
            return res.status(400).json({ error: 'Type must be "data" or "airtime".' });
        }
        if (!phoneNumber || !isValidNigerianPhone(phoneNumber)) {
            return res.status(400).json({ error: 'Invalid Nigerian phone number. Must be 11 digits starting with 07/08/09.' });
        }
        if (type === 'data' && !planId) {
            return res.status(400).json({ error: 'Data plan ID is required for data purchases.' });
        }
        if (type === 'airtime' && (!amountPaid || amountPaid < 50 || amountPaid > 50000)) {
            return res.status(400).json({ error: 'Airtime amount must be between ₦50 and ₦50,000.' });
        }

        // ─── Idempotency Check ────────────────────────────────────────
        const orderRef = db.collection('calebnet_orders').doc(reference);
        const existingDoc = await orderRef.get();

        if (existingDoc.exists) {
            const existingData = existingDoc.data()!;
            if (existingData.paymentStatus === 'PAID') {
                return res.status(200).json({
                    data: {
                        success: true,
                        message: 'Order already processed',
                        firestoreOrderId: existingDoc.id,
                        fulfillmentStatus: existingData.fulfillmentStatus
                    }
                });
            }
        }

        // ─── Verify Payment with Paystack ─────────────────────────────
        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!secretKey) {
            return res.status(500).json({ error: 'Payment verification not configured. Contact support.' });
        }

        let paystackData;
        try {
            const paystackResponse = await axios.get(
                `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
                {
                    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
                    timeout: 10000,
                }
            );
            paystackData = paystackResponse.data.data;
        } catch (paystackErr: any) {
            console.error('[CalebNet] Paystack verification failed:', paystackErr.response?.data || paystackErr.message);
            return res.status(502).json({ error: 'Unable to verify payment with Paystack. Please try again or contact support.' });
        }

        if (paystackData.status !== 'success') {
            return res.status(400).json({ error: `Payment was not successful. Status: ${paystackData.status}` });
        }

        // ─── Amount Verification ──────────────────────────────────────
        const verifiedAmount = paystackData.amount / 100; // Paystack returns kobo

        // ─── Save Order BEFORE VTpass Call ─────────────────────────────
        const requestId = generateRequestId(reference);

        const orderRecord = {
            network: orderData.network,
            type: orderData.type,
            phoneNumber: orderData.phoneNumber,
            planId: orderData.planId || null,
            planName: orderData.planName || 'Airtime',
            amountPaid: verifiedAmount,
            provider: 'vtpass',
            providerReference: requestId,
            paymentReference: reference,
            paymentStatus: 'PAID',
            fulfillmentStatus: 'PROCESSING',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        await orderRef.set(orderRecord);

        // ─── Call VTpass API ───────────────────────────────────────────
        const VTPASS_BASE_URL = process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com/api';
        const apiKey = process.env.VTPASS_API_KEY || '';
        const vtpassSecret = process.env.VTPASS_SECRET || '';

        const serviceID = type === 'data'
            ? `${network.toLowerCase()}-data`
            : network.toLowerCase();

        const payload: any = {
            request_id: requestId,
            serviceID,
            billersCode: phoneNumber,
            amount: verifiedAmount,
            phone: phoneNumber
        };

        if (type === 'data' && planId) {
            payload.variation_code = planId;
        }

        let vtpassRes;
        try {
            vtpassRes = await axios.post(`${VTPASS_BASE_URL}/pay`, payload, {
                headers: {
                    'api-key': apiKey,
                    'secret-key': vtpassSecret,
                },
                timeout: VTPASS_TIMEOUT,
            });
        } catch (e: any) {
            const errData = e.response?.data || e.message;
            const isTimeout = e.code === 'ECONNABORTED';
            console.error('[CalebNet] VTpass call failed:', isTimeout ? 'TIMEOUT' : errData);

            // Payment was collected but VTpass is unreachable
            const failStatus = isTimeout ? 'PENDING_PROVIDER' : 'REFUND_REQUIRED';
            await orderRef.update({
                fulfillmentStatus: failStatus,
                providerResponse: { error: isTimeout ? 'VTpass timeout' : errData, timestamp: new Date().toISOString() },
                updatedAt: FieldValue.serverTimestamp()
            });

            // Notify admin of the issue
            notifyAdmin({ ...orderRecord, amountPaid: verifiedAmount }, failStatus);

            return res.status(200).json({
                data: {
                    success: true,
                    message: isTimeout
                        ? 'Payment received. Provider is taking long — your recharge may still go through. Admin has been notified.'
                        : 'Payment received but provider is unreachable. Admin has been notified and will resolve this.',
                    firestoreOrderId: reference,
                    fulfillmentStatus: failStatus
                }
            });
        }

        // ─── Process VTpass Response ──────────────────────────────────
        const vtData = vtpassRes.data;
        let finalStatus = 'REFUND_REQUIRED';
        let userMessage = '';

        if (vtData.code === '000') {
            finalStatus = 'SUCCESSFUL';
            userMessage = 'Recharge delivered successfully!';
        } else if (vtData.code === '099') {
            finalStatus = 'PENDING_PROVIDER';
            userMessage = 'Recharge is processing with the network. This usually completes in a few seconds.';
        } else {
            finalStatus = 'REFUND_REQUIRED';
            userMessage = `Recharge failed: ${mapVTpassError(vtData.code, vtData.response_description)}. Admin has been notified.`;
        }

        await orderRef.update({
            fulfillmentStatus: finalStatus,
            providerResponse: vtData,
            updatedAt: FieldValue.serverTimestamp()
        });

        // Send push notification to admin
        notifyAdmin({ ...orderRecord, amountPaid: verifiedAmount }, finalStatus);

        return res.status(200).json({
            data: {
                success: true,
                message: userMessage,
                firestoreOrderId: reference,
                fulfillmentStatus: finalStatus
            }
        });

    } catch (err: any) {
        console.error('[CalebNet] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'An unexpected error occurred. If you were charged, contact support.' });
    }
}
