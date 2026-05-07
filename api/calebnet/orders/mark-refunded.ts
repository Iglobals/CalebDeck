import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../../_lib/firebase-admin';
import { requireAdmin, setCors } from '../../_lib/calebnet';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(401).json({ error: 'Admin access required' });
        const paymentReference = String(req.body?.paymentReference || '').trim();
        if (!paymentReference) return res.status(400).json({ error: 'paymentReference is required' });

        await adminDb().collection('calebnet_orders').doc(paymentReference).set({
            fulfillmentStatus: 'CANCELLED',
            providerRemark: req.body?.remark || 'Marked refunded by admin',
            refundedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('[CalebNet Mark Refunded]', error);
        return res.status(500).json({ error: 'Unable to mark order refunded' });
    }
}
