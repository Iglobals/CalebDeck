import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from '../_lib/firebase-admin';
import { setCors } from '../_lib/calebnet';

function studentOrder(data: any, id: string) {
    return {
        id,
        type: data.type,
        network: data.network,
        phoneNumber: data.phoneNumber,
        planName: data.planName,
        amountPaid: data.amountPaid,
        paymentStatus: data.paymentStatus,
        fulfillmentStatus: data.fulfillmentStatus,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const paymentReference = String(req.query.paymentReference || '').trim();
        if (!paymentReference) return res.status(400).json({ error: 'paymentReference is required' });

        const doc = await adminDb().collection('calebnet_orders').doc(paymentReference).get();
        if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
        return res.status(200).json({ success: true, order: studentOrder(doc.data(), doc.id) });
    } catch (error: any) {
        console.error('[CalebNet Status]', error);
        return res.status(500).json({ error: 'Unable to fetch CalebNet order status' });
    }
}
