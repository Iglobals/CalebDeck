import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';

const MAX_RETRIES = 3;

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
const VTPASS_TIMEOUT = 15000;

function generateRequestId(reference: string, retryCount: number) {
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const cleanRef = reference.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6);
    return `${ts}${cleanRef}R${retryCount}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        if (!db) return res.status(500).json({ error: 'Server not configured' });

        const { reference } = req.body;
        if (!reference || typeof reference !== 'string') {
            return res.status(400).json({ error: 'Order reference is required' });
        }

        const orderRef = db.collection('calebnet_orders').doc(reference);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });

        const orderData = orderDoc.data()!;

        // Guard: don't retry if already successful
        if (orderData.fulfillmentStatus === 'SUCCESSFUL') {
            return res.status(400).json({ error: 'This order was already delivered successfully. No retry needed.' });
        }

        // Guard: must have been paid
        if (orderData.paymentStatus !== 'PAID') {
            return res.status(400).json({ error: 'Payment was not verified for this order. Cannot retry.' });
        }

        // Guard: cap retries
        const currentRetryCount = orderData.retryCount || 0;
        if (currentRetryCount >= MAX_RETRIES) {
            return res.status(400).json({
                error: `Maximum retry limit (${MAX_RETRIES}) reached. This order must be resolved manually — process a refund or contact the provider directly.`
            });
        }

        const retryCount = currentRetryCount + 1;
        const newRequestId = generateRequestId(reference, retryCount);

        const VTPASS_BASE_URL = process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com/api';
        const apiKey = process.env.VTPASS_API_KEY || '';
        const vtpassSecret = process.env.VTPASS_SECRET || '';

        const serviceID = orderData.type === 'data'
            ? `${orderData.network.toLowerCase()}-data`
            : orderData.network.toLowerCase();

        const payload: any = {
            request_id: newRequestId,
            serviceID,
            billersCode: orderData.phoneNumber,
            amount: orderData.amountPaid,
            phone: orderData.phoneNumber
        };

        if (orderData.type === 'data' && orderData.planId) {
            payload.variation_code = orderData.planId;
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
            const isTimeout = e.code === 'ECONNABORTED';
            console.error('[CalebNet Retry] VTpass error:', isTimeout ? 'TIMEOUT' : e.response?.data || e.message);

            await orderRef.update({
                retryCount,
                providerReference: newRequestId,
                fulfillmentStatus: isTimeout ? 'PENDING_PROVIDER' : 'REFUND_REQUIRED',
                providerResponse: { error: isTimeout ? 'VTpass timeout on retry' : (e.response?.data || e.message), retryAttempt: retryCount, timestamp: new Date().toISOString() },
                updatedAt: FieldValue.serverTimestamp()
            });

            return res.status(502).json({
                error: isTimeout
                    ? 'Provider timed out on retry. It may still process — try requerying in a few minutes.'
                    : 'Provider unreachable. Try again later.',
                retryCount
            });
        }

        const vtData = vtpassRes.data;
        let finalStatus = 'REFUND_REQUIRED';

        if (vtData.code === '000') {
            finalStatus = 'SUCCESSFUL';
        } else if (vtData.code === '099') {
            finalStatus = 'PENDING_PROVIDER';
        }

        await orderRef.update({
            fulfillmentStatus: finalStatus,
            providerReference: newRequestId,
            providerResponse: { ...vtData, retryAttempt: retryCount, timestamp: new Date().toISOString() },
            retryCount,
            updatedAt: FieldValue.serverTimestamp()
        });

        return res.status(200).json({
            success: true,
            status: finalStatus,
            retryCount,
            message: finalStatus === 'SUCCESSFUL'
                ? 'Retry successful! Recharge delivered.'
                : finalStatus === 'PENDING_PROVIDER'
                    ? 'Retry submitted. Processing with the network.'
                    : 'Retry failed. Consider manual refund.',
            data: vtData
        });

    } catch (err: any) {
        console.error('[CalebNet Retry] Unhandled error:', err.message);
        return res.status(500).json({ error: 'Internal error during retry' });
    }
}
