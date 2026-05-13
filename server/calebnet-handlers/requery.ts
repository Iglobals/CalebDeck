import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin.js';
import { clubkonnectGet, getClubkonnectConfig, mapProviderStatus, requireAdmin, setCors, shouldPreserveSuccessful, updateProviderHealth } from '../calebnet.js';
import { refundWalletForCalebNetOrder } from '../wallet.js';
import { recordCalebNetAnalytics } from '../calebnet-analytics.js';

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
        const response = await clubkonnectGet('/APIQueryV1.asp', {
            UserID: userId,
            APIKey: apiKey,
            RequestID: order.providerRequestId,
        }, 20000);

        const nextStatus = mapProviderStatus(response);
        const patch: Record<string, any> = {
            providerStatusCode: response?.statuscode || response?.statusCode || null,
            providerStatus: response?.status || response?.orderstatus || null,
            providerRemark: response?.orderremark || response?.remark || response?.message || null,
            providerResponse: response,
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
        await updateProviderHealth(order.network, order.type, nextStatus === 'REFUND_REQUIRED' || nextStatus === 'FAILED' ? 'failure' : 'success');

        if (
            order.paymentProvider === 'wallet' &&
            !order.walletRefundTransactionId &&
            !shouldPreserveSuccessful(order.fulfillmentStatus, nextStatus) &&
            (nextStatus === 'REFUND_REQUIRED' || nextStatus === 'FAILED')
        ) {
            await refundWalletForCalebNetOrder({
                orderId: orderRef.id,
                reason: 'Provider requery confirmed failure. Wallet refunded.',
            });
        }

        const finalOrder = await orderRef.get();
        const finalStatus = patch.fulfillmentStatus || order.fulfillmentStatus;
        await recordCalebNetAnalytics(orderRef, finalOrder.data(), finalStatus);

        return res.status(200).json({ success: true, status: finalStatus, data: response });
    } catch (error: any) {
        console.error('[CalebNet Requery]', error);
        return res.status(500).json({ error: error.message || 'Requery failed' });
    }
}
