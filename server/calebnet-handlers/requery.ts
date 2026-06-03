import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin.js';
import { clubkonnectGet, getClubkonnectConfig, isRefundableProviderStatus, mapProviderStatus, providerHealthOutcomeForStatus, requireAdmin, setCors, shouldPreserveSuccessful, updateProviderHealth } from '../calebnet.js';
import { refundWalletForCalebNetOrder } from '../wallet.js';
import { recordCalebNetAnalytics } from '../calebnet-analytics.js';

function hasUsefulProviderStatus(response: any) {
    return Boolean(
        response &&
        (
            response.statuscode ||
            response.statusCode ||
            response.code ||
            response.status ||
            response.orderstatus ||
            response.orderStatus
        )
    );
}

function adminRequeryMessage(status: string, response: any) {
    if (status === 'SUCCESSFUL') return 'Provider confirmed this transaction as successful.';
    if (status === 'REFUND_REQUIRED' || status === 'FAILED' || status === 'CANCELLED') return 'Provider confirmed this transaction did not complete. Wallet refund/review has been handled where possible.';
    if (status === 'ORDER_RECEIVED' || status === 'PROCESSING' || status === 'PENDING_PROVIDER') {
        return 'Provider has not confirmed final delivery yet. Keep this order under review and do not retry blindly.';
    }
    return response?.remark || response?.orderremark || response?.message || 'Provider status checked.';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(401).json({ error: 'Admin access required' });

        const db = adminDb();
        const { paymentReference, requestId } = req.body || {};
        let orderRef: FirebaseFirestore.DocumentReference | null = null;
        let orderSnap: FirebaseFirestore.DocumentSnapshot | null = null;

        if (paymentReference) {
            orderRef = db.collection('calebnet_orders').doc(String(paymentReference));
            orderSnap = await orderRef.get();
        } else if (requestId) {
            const snap = await db.collection('calebnet_orders').where('providerRequestId', '==', String(requestId)).limit(1).get();
            if (!snap.empty) {
                orderSnap = snap.docs[0];
                orderRef = orderSnap.ref;
            }
        }

        if (!orderRef || !orderSnap?.exists) return res.status(404).json({ error: 'Order not found' });
        const order = orderSnap.data()!;
        const { userId, apiKey } = getClubkonnectConfig();
        let queryMode = 'RequestID';
        let response = await clubkonnectGet('/APIQueryV1.asp', {
            UserID: userId,
            APIKey: apiKey,
            RequestID: order.providerRequestId,
        }, 20000);

        if (!hasUsefulProviderStatus(response) && order.providerOrderId) {
            queryMode = 'OrderID';
            response = await clubkonnectGet('/APIQueryV1.asp', {
                UserID: userId,
                APIKey: apiKey,
                OrderID: order.providerOrderId,
            }, 20000);
        }

        const nextStatus = mapProviderStatus(response);
        const patch: Record<string, any> = {
            providerStatusCode: response?.statuscode || response?.statusCode || null,
            providerStatus: response?.status || response?.orderstatus || null,
            providerRemark: response?.orderremark || response?.remark || response?.message || null,
            providerResponse: response,
            providerQueryMode: queryMode,
            lastRequeryAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (order.walletRefundTransactionId && nextStatus === 'SUCCESSFUL') {
            patch.providerRemark = `${patch.providerRemark || 'Provider later reported success'} (wallet had already been refunded)`;
        } else if (!shouldPreserveSuccessful(order.fulfillmentStatus, nextStatus)) {
            patch.fulfillmentStatus = nextStatus;
        }
        if (response?.orderid || response?.OrderID) patch.providerOrderId = response.orderid || response.OrderID;

        await orderRef.update(patch);
        await updateProviderHealth(
            order.network,
            order.type,
            providerHealthOutcomeForStatus(nextStatus),
            ['ORDER_RECEIVED', 'PROCESSING', 'PENDING_PROVIDER'].includes(nextStatus)
                ? 'Provider has not returned a final status yet.'
                : (patch.providerRemark || null)
        );

        if (
            order.paymentProvider === 'wallet' &&
            !order.walletRefundTransactionId &&
            !shouldPreserveSuccessful(order.fulfillmentStatus, nextStatus) &&
            isRefundableProviderStatus(nextStatus)
        ) {
            await refundWalletForCalebNetOrder({
                orderId: orderRef.id,
                reason: 'Provider requery confirmed failure. Wallet refunded.',
                fulfillmentStatus: nextStatus,
            });
        }

        const finalOrder = await orderRef.get();
        const finalStatus = patch.fulfillmentStatus || order.fulfillmentStatus;
        await recordCalebNetAnalytics(orderRef, finalOrder.data(), finalStatus);

        return res.status(200).json({
            success: true,
            status: finalStatus,
            queryMode,
            message: adminRequeryMessage(finalStatus, response),
            providerOrderId: patch.providerOrderId || order.providerOrderId || null,
            data: response,
        });
    } catch (error: any) {
        console.error('[CalebNet Requery]', error);
        return res.status(500).json({ error: error.message || 'Requery failed' });
    }
}
