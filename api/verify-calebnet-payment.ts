import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';
import { adminDb } from '../server/firebase-admin.js';
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
    safePayload,
    setCors,
    updateProviderHealth,
} from '../server/calebnet.js';

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

        if (!catalogDoc?.exists) return res.status(400).json({ error: 'Selected CalebNet product is not available' });
        const catalog = catalogDoc.data()!;
        if (!catalog.isActive || catalog.type !== type || catalog.network !== network) {
            return res.status(400).json({ error: 'Selected CalebNet product is not active' });
        }

        const expectedAmount = type === 'DATA' ? Number(catalog.sellingPrice || 0) : Number(orderData.amountPaid || 0);
        if (Math.abs(verifiedAmount - expectedAmount) > 1) {
            return res.status(400).json({ error: 'Payment amount does not match CalebNet price' });
        }

        const providerCost = type === 'DATA'
            ? Number(catalog.providerCost || 0)
            : Number((verifiedAmount * (1 - Number(catalog.airtimeDiscountPercent || 0) / 100)).toFixed(2));
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

        await updateProviderHealth(network, type, fulfillmentStatus === 'REFUND_REQUIRED' || fulfillmentStatus === 'FAILED' ? 'failure' : 'success', null);

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
        return res.status(500).json({ error: error.message || 'CalebNet payment verification failed' });
    }
}
