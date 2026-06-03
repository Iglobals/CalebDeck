import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin.js';
import { verifyUser } from '../verify-user.js';
import {
    CalebNetNetwork,
    CalebNetType,
    NETWORK_CODES,
    clubkonnectGet,
    disableCatalogPlanAfterProviderRejection,
    getClubkonnectConfig,
    isRefundableProviderStatus,
    isValidNigerianPhone,
    makeRequestId,
    mapProviderStatus,
    normalizeNetwork,
    normalizeType,
    providerHealthOutcomeForStatus,
    providerInvalidPlanReason,
    safePayload,
    setCors,
    updateProviderHealth,
} from '../calebnet.js';
import { ensureWalletUser, refundWalletForCalebNetOrder } from '../wallet.js';
import { recordCalebNetAnalytics } from '../calebnet-analytics.js';

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

function clearProviderFailure(response: any) {
    const status = String(response?.status || response?.orderstatus || response?.Status || '').toUpperCase();
    const code = String(response?.statuscode || response?.statusCode || response?.code || '');
    return code === '300' || code === '400' || code === '500' ||
        status.includes('FAILED') ||
        status.includes('INVALID') ||
        status.includes('CANCELLED') ||
        status.includes('INSUFFICIENT');
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

async function notifyAdmin(req: VercelRequest, order: {
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
    } catch (error) {
        console.error('[CalebNet Wallet Purchase] Admin notification failed:', error);
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
                body: JSON.stringify({ title, body: message, tokens, link: '/admin/calebnet' }),
            }).catch((error) => console.error('[CalebNet Wallet Purchase] Push error:', error));
        }
    } catch (error) {
        console.error('[CalebNet Wallet Purchase] Push notification failed:', error);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const user = await verifyUser(req);
        if (!user) return res.status(401).json({ error: 'Sign in to use CalebNet wallet.' });

        await ensureWalletUser(user.uid, {
            email: user.email,
            displayName: user.name,
            phoneNumber: user.phoneNumber,
        });

        const db = adminDb();
        const body = req.body || {};
        const type = normalizeType(body.type);
        const network = normalizeNetwork(body.network);
        const phoneNumber = String(body.phoneNumber || '').trim();
        const clientRequestId = String(body.clientRequestId || '').trim();

        if (!clientRequestId || clientRequestId.length < 8) return res.status(400).json({ error: 'A valid request reference is required' });
        if (!type || !network) return res.status(400).json({ error: 'Valid CalebNet type and network are required' });
        if (!isValidNigerianPhone(phoneNumber)) return res.status(400).json({ error: 'Enter a valid Nigerian phone number' });

        const orderRef = db.collection('calebnet_orders').doc(clientRequestId);
        const existing = await orderRef.get();
        if (existing.exists) {
            const data = existing.data() || {};
            if (data.userId !== user.uid) return res.status(409).json({ error: 'This request reference already exists' });
            return res.status(200).json({ success: true, order: { id: existing.id, ...data }, idempotent: true });
        }

        const health = await db.collection('calebnet_provider_status').doc(`clubkonnect_${type}_${network}`).get();
        if (health.exists && health.data()?.status === 'DOWN') {
            return res.status(409).json({ error: 'This network is temporarily unavailable. Please try again later.' });
        }

        let catalogDoc: FirebaseFirestore.DocumentSnapshot | null = null;
        if (type === 'DATA') {
            const planId = String(body.planId || '').trim();
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

        if (!catalogDoc?.exists) return res.status(409).json({ error: 'This CalebNet product is not available right now.' });
        const catalog = catalogDoc.data() || {};
        if (!catalog.isActive || catalog.type !== type || catalog.network !== network) {
            return res.status(409).json({ error: 'This CalebNet product is not available right now.' });
        }

        const amountPaid = type === 'DATA' ? Number(catalog.sellingPrice || 0) : Number(body.amount || 0);
        if (!Number.isFinite(amountPaid) || amountPaid <= 0) return res.status(400).json({ error: 'Invalid purchase amount' });
        if (type === 'AIRTIME' && (amountPaid < 50 || amountPaid > 200000)) {
            return res.status(400).json({ error: 'Airtime amount must be between ₦50 and ₦200,000' });
        }

        const airtimeDiscount = safeAirtimeDiscount(network, catalog.airtimeDiscountPercent);
        const providerCost = type === 'DATA'
            ? Number(catalog.providerCost || 0)
            : Number((amountPaid * (1 - airtimeDiscount / 100)).toFixed(2));
        const profit = Number((amountPaid - providerCost).toFixed(2));
        const providerPlanCode = type === 'DATA' ? String(catalog.providerPlanCode || '') : null;
        if (type === 'DATA' && !providerPlanCode) return res.status(409).json({ error: 'This data plan is missing provider mapping.' });

        const requestId = makeRequestId(clientRequestId);
        const debitTransactionId = `${clientRequestId}_debit`;
        const debitRef = db.collection('wallet_transactions').doc(debitTransactionId);
        const userRef = db.collection('users').doc(user.uid);
        const requestPayload = {
            UserID: 'configured',
            APIKey: 'configured',
            MobileNetwork: NETWORK_CODES[network],
            MobileNumber: phoneNumber,
            DataPlan: providerPlanCode,
            Amount: type === 'AIRTIME' ? amountPaid : undefined,
            RequestID: requestId,
        };

        let idempotentOrder: any = null;
        await db.runTransaction(async (tx) => {
            const [existingOrder, existingDebit, userSnap] = await Promise.all([
                tx.get(orderRef),
                tx.get(debitRef),
                tx.get(userRef),
            ]);
            if (existingOrder.exists || existingDebit.exists) {
                idempotentOrder = existingOrder.exists ? { id: existingOrder.id, ...existingOrder.data() } : { id: clientRequestId, fulfillmentStatus: 'PROCESSING' };
                return;
            }

            const walletBalance = Number(userSnap.data()?.walletBalance || 0);
            if (walletBalance < amountPaid) {
                throw new Error('INSUFFICIENT_WALLET_BALANCE');
            }

            const balanceAfter = Number((walletBalance - amountPaid).toFixed(2));
            tx.set(userRef, {
                walletBalance: balanceAfter,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            tx.set(debitRef, {
                userId: user.uid,
                type: 'debit',
                amount: amountPaid,
                balanceBefore: walletBalance,
                balanceAfter,
                reference: debitTransactionId,
                purpose: 'CALEBNET_PURCHASE',
                relatedOrderId: clientRequestId,
                status: 'SUCCESSFUL',
                metadataSafe: { type, network, phoneNumber, planId: type === 'DATA' ? catalogDoc!.id : null },
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            tx.set(orderRef, {
                id: clientRequestId,
                type,
                userId: user.uid,
                customerName: user.name || user.email || 'Caleb student',
                customerPhone: user.phoneNumber || phoneNumber,
                network,
                phoneNumber,
                planId: type === 'DATA' ? catalogDoc!.id : null,
                planName: type === 'DATA' ? (catalog.name || catalog.displayName) : 'Airtime',
                providerPlanCode,
                amountPaid,
                providerCost,
                profit,
                paymentReference: clientRequestId,
                paymentProvider: 'wallet',
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
                walletDebitTransactionId: debitTransactionId,
                walletRefundTransactionId: null,
                retryCount: 0,
                lastRequeryAt: null,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        });

        if (idempotentOrder) {
            if (idempotentOrder.userId && idempotentOrder.userId !== user.uid) return res.status(409).json({ error: 'This request reference already exists' });
            return res.status(200).json({ success: true, order: idempotentOrder, idempotent: true });
        }

        await notifyAdmin(req, {
            reference: clientRequestId,
            type,
            network,
            phoneNumber,
            amountPaid,
            planName: type === 'DATA' ? (catalog.name || catalog.displayName) : 'Airtime',
        });

        let providerResponse: any;
        try {
            providerResponse = await vendWithClubkonnect({
                type,
                network,
                phoneNumber,
                providerPlanCode,
                amount: amountPaid,
                requestId,
                host: String(req.headers.host || 'calebdeck.com'),
            });
        } catch (error: any) {
            const isTimeout = error.code === 'ECONNABORTED';
            await orderRef.update({
                fulfillmentStatus: isTimeout ? 'PENDING_PROVIDER' : 'FAILED',
                providerResponse: { error: isTimeout ? 'Clubkonnect timeout' : (error.response?.data || error.message), timestamp: new Date().toISOString() },
                providerRemark: isTimeout ? 'Provider timeout. Admin should requery.' : 'Provider request failed. Wallet refund processed.',
                updatedAt: FieldValue.serverTimestamp(),
            });
            await updateProviderHealth(network, type, isTimeout ? 'timeout' : 'failure', error.message || 'Provider request failed');
            if (!isTimeout) await refundWalletForCalebNetOrder({ orderId: clientRequestId, reason: 'Provider request failed. Wallet refunded.' });

            const afterFailure = await orderRef.get();
            const failureStatus = isTimeout ? 'PENDING_PROVIDER' : 'FAILED';
            await recordCalebNetAnalytics(orderRef, afterFailure.data(), failureStatus);

            return res.status(200).json({ success: true, order: { id: afterFailure.id, ...afterFailure.data() } });
        }

        const fulfillmentStatus = mapProviderStatus(providerResponse);
        const failedClearly = isRefundableProviderStatus(fulfillmentStatus) || clearProviderFailure(providerResponse);
        const finalFailureStatus = isRefundableProviderStatus(fulfillmentStatus) ? fulfillmentStatus : 'FAILED';
        const invalidPlanReason = type === 'DATA' ? providerInvalidPlanReason(providerResponse) : null;
        await orderRef.update({
            fulfillmentStatus: failedClearly ? finalFailureStatus : fulfillmentStatus,
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
            failedClearly ? 'failure' : providerHealthOutcomeForStatus(fulfillmentStatus),
            failedClearly
                ? 'Provider returned clear failure'
                : fulfillmentStatus === 'ORDER_RECEIVED'
                    ? 'Provider accepted the order but has not completed it yet.'
                    : null
        );
        if (failedClearly) {
            await refundWalletForCalebNetOrder({ orderId: clientRequestId, reason: 'Provider confirmed failure. Wallet refunded.', fulfillmentStatus: finalFailureStatus });
        }
        if (invalidPlanReason) {
            await disableCatalogPlanAfterProviderRejection({ planId: catalogDoc?.id }, invalidPlanReason);
        }

        const finalOrder = await orderRef.get();
        const finalStatus = failedClearly ? finalFailureStatus : fulfillmentStatus;
        await recordCalebNetAnalytics(orderRef, finalOrder.data(), finalStatus);

        return res.status(200).json({ success: true, order: { id: finalOrder.id, ...finalOrder.data() } });
    } catch (error: any) {
        if (error?.message === 'INSUFFICIENT_WALLET_BALANCE') {
            return res.status(402).json({ error: 'Insufficient wallet balance. Fund wallet to continue.' });
        }
        console.error('[CalebNet Wallet Purchase]', error);
        const raw = error.message || '';
        const isTechnical = raw.includes('Firestore') || raw.includes('firebase') || raw.includes('undefined') || raw.includes('INTERNAL');
        return res.status(500).json({ error: isTechnical ? 'Something went wrong processing your request. Please try again.' : (raw || 'CalebNet wallet purchase failed') });
    }
}
