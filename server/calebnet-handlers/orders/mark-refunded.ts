import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../../firebase-admin.js';
import { requireAdmin, setCors } from '../../calebnet.js';
import { refundWalletForCalebNetOrder } from '../../wallet.js';
import { recordCalebNetAnalytics } from '../../calebnet-analytics.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(401).json({ error: 'Admin access required' });
        const paymentReference = String(req.body?.paymentReference || '').trim();
        if (!paymentReference) return res.status(400).json({ error: 'paymentReference is required' });

        const orderSnap = await adminDb().collection('calebnet_orders').doc(paymentReference).get();
        if (!orderSnap.exists) return res.status(404).json({ error: 'Order not found' });

        if (orderSnap.data()?.paymentProvider === 'wallet') {
            await refundWalletForCalebNetOrder({
                orderId: paymentReference,
                reason: req.body?.remark || 'Marked refunded by admin',
                fulfillmentStatus: 'CANCELLED',
            });
            const finalOrder = await orderSnap.ref.get();
            await recordCalebNetAnalytics(orderSnap.ref, finalOrder.data(), 'CANCELLED');
            return res.status(200).json({ success: true });
        }

        await orderSnap.ref.set({
            fulfillmentStatus: 'CANCELLED',
            providerRemark: req.body?.remark || 'Marked refunded by admin',
            refundedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        const finalOrder = await orderSnap.ref.get();
        await recordCalebNetAnalytics(orderSnap.ref, finalOrder.data(), 'CANCELLED');

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('[CalebNet Mark Refunded]', error);
        return res.status(500).json({ error: 'Unable to mark order refunded' });
    }
}
