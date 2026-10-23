import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';
import { adminDb } from './firebase-admin.js';
import {
    CalebNetNetwork,
    CalebNetType,
    NETWORK_CODES,
    clubkonnectGet,
    getClubkonnectConfig,
    isValidNigerianPhone,
    makeRequestId,
    mapProviderStatus,
    normalizeNetwork,
    normalizeType,
    providerHealthOutcomeForStatus,
    safePayload,
    setCors,
    updateProviderHealth,
} from './calebnet.js';

const FALLBACK_AIRTIME_DISCOUNTS: Record<CalebNetNetwork, number> = {
    MTN: 3,
    GLO: 8,
    AIRTEL: 3,
    '9MOBILE': 7,
};

function safeAirtimeDiscount(network: CalebNetNetwork, value: any) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 30) return parsed;
    return FALLBACK_AIRTIME_DISCOUNTS[network] || 0;
}

async function verifyPaystack(reference: string) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error('Payment verification is not configured');

    const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secretKey}` }, timeout: 15000 }
    );
    return response.data?.data;
}

async function vendWithClubkonnect(params: {
    type: CalebNetType;
    network: CalebNetNetwork;
    phoneNumber: string;
    providerPlanCode: string | null;
    amount: number;
    requestId: string;
    host: string;
}) {
    const { userId, apiKey } = getClubkonnectConfig();
    const protocol = process.env.CLUBKONNECT_CALLBACK_PROTOCOL || 'https';
    const callbackHost = process.env.CLUBKONNECT_CALLBACK_HOST || params.host || 'calebdeck.com';
    const callbackUrl = `${protocol}://${callbackHost}/api/clubkonnect-callback`;
    const base = {
        UserID: userId,
        APIKey: apiKey,
        MobileNetwork: NETWORK_CODES[params.network],
        MobileNumber: params.phoneNumber,
        RequestID: params.requestId,
        CallBackURL: callbackUrl,
    };

    if (params.type === 'DATA') {
        return clubkonnectGet('/APIDatabundleV1.asp', {
            ...base,
            DataPlan: params.providerPlanCode,
        }, 25000);
    }

    return clubkonnectGet('/APIAirtimeV1.asp', {
        ...base,
        Amount: params.amount,
    }, 25000);
}

async function notifyAdminOfCalebNetOrder(req: VercelRequest, order: {
    reference: string;
    type: CalebNetType;
    network: CalebNetNetwork;
    phoneNumber: string;
    amountPaid: number;
    planName: string | null;
}) {
    const db = adminDb();
    const service = order.type === 'DATA' ? (order.planName || 'Data') : 'Airtime';
    const title = `New CalebNet ${order.type === 'DATA' ? 'Data' : 'Airtime'} Order`;
    const message = `${order.network} ${service} for ${order.phoneNumber} - ₦${Number(order.amountPaid || 0).toLocaleString()}`;

    try {
        await db.collection('notifications').add({
            userId: 'admin',
            title,
            message,
            type: 'calebnet',
            link: '/admin/calebnet',
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (notifErr) {
        console.error('[CalebNet Verify Payment] Failed to create admin notification:', notifErr);
    }

    try {
        const adminsSnap = await db.collection('users').where('role', '==', 'ADMIN').get();
        let tokens: string[] = [];
        adminsSnap.docs.forEach((doc) => {
            const data = doc.data();
            if (Array.isArray(data.fcmTokens)) tokens = [...tokens, ...data.fcmTokens];
        });

        if (tokens.length > 0 && process.env.INTERNAL_API_KEY) {
            const protocol = req.headers['x-forwarded-proto'] || 'https';
            const host = req.headers.host || 'calebdeck.com';
            await fetch(`${protocol}://${host}/api/send-push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': process.env.INTERNAL_API_KEY,
                },
                body: JSON.stringify({
                    title,
                    body: message,
                    tokens,
                    link: '/admin/calebnet',
                }),
            }).catch((error) => console.error('[CalebNet Verify Payment] Push error:', error));
        }
    } catch (pushErr) {
        console.error('[CalebNet Verify Payment] Push notification error:', pushErr);
    }
}

async function createRefundReviewOrder(req: VercelRequest, params: {
    reference: string;
    type: CalebNetType;
    network: CalebNetNetwork;
    phoneNumber: string;
    amountPaid: number;
    orderData: any;
    reason: string;
    paymentCustomer?: any;
}) {
    const db = adminDb();
    const requestId = makeRequestId(params.reference);
    const order = {
        id: params.reference,
        type: params.type,
        userId: params.orderData?.userId || null,
        customerName: params.orderData?.customerName || params.paymentCustomer?.email || 'Caleb student',
        customerPhone: params.orderData?.customerPhone || params.phoneNumber,
        network: params.network,
        phoneNumber: params.phoneNumber,
        planId: params.type === 'DATA' ? String(params.orderData?.planId || '') || null : null,
        planName: params.orderData?.planName || (params.type === 'DATA' ? 'Unavailable data plan' : 'Airtime'),
        providerPlanCode: null,
        amountPaid: params.amountPaid,
        providerCost: 0,
        profit: 0,
        paymentReference: params.reference,
        paymentProvider: 'paystack',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'REFUND_REQUIRED',
        provider: 'clubkonnect',
        providerOrderId: null,
        providerRequestId: requestId,
        providerStatusCode: null,
        providerStatus: 'NOT_SENT_TO_PROVIDER',
        providerRemark: params.reason,
        requestPayloadSafe: {},
        providerResponse: { error: params.reason, stage: 'before_provider_vend' },
        retryCount: 0,
        lastRequeryAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection('calebnet_orders').doc(params.reference).create(order);
    await notifyAdminOfCalebNetOrder(req, {
        reference: params.reference,
        type: params.type,
        network: params.network,
        phoneNumber: params.phoneNumber,
        amountPaid: params.amountPaid,
        planName: order.planName,
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const db = adminDb();
        const { reference, orderData } = req.body || {};
        if (!reference || typeof reference !== 'string') return res.status(400).json({ error: 'Payment reference is required' });

        const existing = await db.collection('calebnet_orders').doc(reference).get();
        if (existing.exists) {
            const data = existing.data()!;
            return res.status(200).json({
                data: {
                    success: true,
                    message: 'Order already exists',
                    firestoreOrderId: reference,
                    fulfillmentStatus: data.fulfillmentStatus,
                },
            });
        }

        const type = normalizeType(orderData?.type);
        const network = normalizeNetwork(orderData?.network);
        const phoneNumber = String(orderData?.phoneNumber || '').trim();
        if (!type || !network) return res.status(400).json({ error: 'Valid CalebNet type and network are required' });
        if (!isValidNigerianPhone(phoneNumber)) return res.status(400).json({ error: 'Enter a valid Nigerian phone number' });
        if (type === 'AIRTIME' && (Number(orderData?.amountPaid) < 50 || Number(orderData?.amountPaid) > 200000)) {
            return res.status(400).json({ error: 'Airtime amount must be between ₦50 and ₦200,000' });
        }

        const health = await db.collection('calebnet_provider_status').doc(`clubkonnect_${type}_${network}`).get();
        if (health.exists && health.data()?.status === 'DOWN') {
            return res.status(409).json({ error: 'This network is temporarily unavailable. Please try again later.' });
        }

        const payment = await verifyPaystack(reference);
        if (payment?.status !== 'success') {
            return res.status(400).json({ error: 'Payment was not successful' });
        }
        const verifiedAmount = Number(payment.amount || 0) / 100;

        let catalogDoc: FirebaseFirestore.DocumentSnapshot | null = null;
        if (type === 'DATA') {
            const planId = String(orderData?.planId || '');
            if (!planId) return res.status(400).json({ error: 'Data plan is required' });
            catalogDoc = await db.collection('calebnet_catalog').doc(planId).get();
        } else {
            const airtimeSnap = await db.collection('calebnet_catalog')
                .where('type', '==', 'AIRTIME')
                .where('network', '==', network)
                .where('isActive', '==', true)
                .limit(1)
                .get();
            catalogDoc = airtimeSnap.empty ? null : airtimeSnap.docs[0];
        }

        if (!catalogDoc?.exists) {
            await createRefundReviewOrder(req, {
                reference,
                type,
                network,
                phoneNumber,
                amountPaid: verifiedAmount,
                orderData,
                reason: 'Selected CalebNet product was not active after payment.',
                paymentCustomer: payment.customer,
            });
            return res.status(200).json({
                data: {
                    success: true,
                    firestoreOrderId: reference,
                    fulfillmentStatus: 'REFUND_REQUIRED',
                    message: 'Payment received, but this CalebNet product needs admin review.',
                },
            });
        }
        const catalog = catalogDoc.data()!;
        if (!catalog.isActive || catalog.type !== type || catalog.network !== network) {
            await createRefundReviewOrder(req, {
                reference,
                type,
                network,
                phoneNumber,
                amountPaid: verifiedAmount,
                orderData,
                reason: 'Selected CalebNet product was inactive or mismatched after payment.',
                paymentCustomer: payment.customer,
            });
            return res.status(200).json({
                data: {
                    success: true,
                    firestoreOrderId: reference,
                    fulfillmentStatus: 'REFUND_REQUIRED',
                    message: 'Payment received, but this CalebNet product needs admin review.',
                },
            });
        }

        const expectedAmount = type === 'DATA' ? Number(catalog.sellingPrice || 0) : Number(orderData.amountPaid || 0);
        if (Math.abs(verifiedAmount - expectedAmount) > 1) {
            return res.status(400).json({ error: 'Payment amount does not match CalebNet price' });
        }

        const airtimeDiscount = safeAirtimeDiscount(network, catalog.airtimeDiscountPercent);
        const providerCost = type === 'DATA'
            ? Number(catalog.providerCost || 0)
            : Number((verifiedAmount * (1 - airtimeDiscount / 100)).toFixed(2));
        const profit = Number((verifiedAmount - providerCost).toFixed(2));
        const requestId = makeRequestId(reference);
        const providerPlanCode = type === 'DATA' ? String(catalog.providerPlanCode || '') : null;
        const requestPayload = {
            UserID: 'configured',
            APIKey: 'configured',
            MobileNetwork: NETWORK_CODES[network],
            MobileNumber: phoneNumber,
            DataPlan: providerPlanCode,
            Amount: type === 'AIRTIME' ? verifiedAmount : undefined,
            RequestID: requestId,
        };

        const orderRef = db.collection('calebnet_orders').doc(reference);
        const baseOrder = {
            id: reference,
            type,
            userId: orderData?.userId || null,
            customerName: orderData?.customerName || payment.customer?.email || 'Caleb student',
            customerPhone: orderData?.customerPhone || phoneNumber,
            network,
            phoneNumber,
            planId: type === 'DATA' ? catalogDoc.id : null,
            planName: type === 'DATA' ? (catalog.name || catalog.displayName) : 'Airtime',
            providerPlanCode,
            amountPaid: verifiedAmount,
            providerCost,
            profit,
            paymentReference: reference,
            paymentProvider: 'paystack',
            paymentStatus: 'PAID',
            fulfillmentStatus: 'PROCESSING',
            provider: 'clubkonnect',
            providerOrderId: null,
            providerRequestId: requestId,
            providerStatusCode: null,
            providerStatus: null,
            providerRemark: null,
            requestPayloadSafe: safePayload(requestPayload),
            providerResponse: {},
            retryCount: 0,
            lastRequeryAt: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        await orderRef.create(baseOrder);
        await notifyAdminOfCalebNetOrder(req, {
            reference,
            type,
            network,
            phoneNumber,
            amountPaid: verifiedAmount,
            planName: baseOrder.planName,
        });

        let providerResponse: any;
        try {
            providerResponse = await vendWithClubkonnect({
                type,
                network,
                phoneNumber,
                providerPlanCode,
                amount: verifiedAmount,
                requestId,
                host: String(req.headers.host || 'calebdeck.com'),
            });
        } catch (error: any) {
            const isTimeout = error.code === 'ECONNABORTED';
            await orderRef.update({
                fulfillmentStatus: isTimeout ? 'PENDING_PROVIDER' : 'REFUND_REQUIRED',
                providerResponse: { error: isTimeout ? 'Clubkonnect timeout' : (error.response?.data || error.message), timestamp: new Date().toISOString() },
                updatedAt: FieldValue.serverTimestamp(),
            });
            await updateProviderHealth(network, type, isTimeout ? 'timeout' : 'failure', error.message || 'Provider request failed');
            return res.status(200).json({
                data: {
                    success: true,
                    firestoreOrderId: reference,
                    fulfillmentStatus: isTimeout ? 'PENDING_PROVIDER' : 'REFUND_REQUIRED',
                },
            });
        }

        const fulfillmentStatus = mapProviderStatus(providerResponse);
        await orderRef.update({
            fulfillmentStatus,
            providerOrderId: providerResponse?.orderid || providerResponse?.OrderID || null,
            providerStatusCode: providerResponse?.statuscode || providerResponse?.statusCode || null,
            providerStatus: providerResponse?.status || providerResponse?.orderstatus || null,
            providerRemark: providerResponse?.orderremark || providerResponse?.remark || providerResponse?.message || null,
            providerResponse,
            updatedAt: FieldValue.serverTimestamp(),
        });

        await updateProviderHealth(
            network,
            type,
            providerHealthOutcomeForStatus(fulfillmentStatus),
            ['ORDER_RECEIVED', 'PROCESSING', 'PENDING_PROVIDER'].includes(fulfillmentStatus)
                ? 'Provider has not returned a final status yet.'
                : null
        );

        return res.status(200).json({
            data: {
                success: true,
                firestoreOrderId: reference,
                fulfillmentStatus,
            },
        });
    } catch (error: any) {
        console.error('[CalebNet Verify Payment]', error);
        if (error?.code === 6) {
            return res.status(200).json({ data: { success: true, message: 'Order already exists' } });
        }
        const raw = error.message || '';
        const isTechnical = raw.includes('Firestore') || raw.includes('firebase') || raw.includes('undefined') || raw.includes('INTERNAL');
        return res.status(500).json({ error: isTechnical ? 'Something went wrong processing your payment. Please contact support.' : (raw || 'CalebNet payment verification failed') });
    }
}
