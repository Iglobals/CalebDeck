import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './_lib/firebase-admin';
import { mapProviderStatus, setCors, shouldPreserveSuccessful, updateProviderHealth } from './_lib/calebnet';

function callbackBody(req: VercelRequest) {
    return { ...(req.query || {}), ...(typeof req.body === 'object' ? req.body : {}) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const body = callbackBody(req);
        const secret = process.env.CLUBKONNECT_CALLBACK_SECRET;
        if (secret) {
            const received = body.secret || body.callbackSecret || req.headers['x-clubkonnect-secret'];
            if (received !== secret) return res.status(401).json({ error: 'Invalid callback secret' });
        }

        const requestId = String(body.requestid || body.RequestID || body.requestId || '').trim();
        const orderId = String(body.orderid || body.OrderID || '').trim();
        const db = adminDb();
        let snap: FirebaseFirestore.QuerySnapshot | null = null;

        if (requestId) {
            snap = await db.collection('calebnet_orders').where('providerRequestId', '==', requestId).limit(1).get();
        }
        if ((!snap || snap.empty) && orderId) {
            snap = await db.collection('calebnet_orders').where('providerOrderId', '==', orderId).limit(1).get();
        }
        if (!snap || snap.empty) return res.status(404).json({ error: 'Order not found' });

        const doc = snap.docs[0];
        const order = doc.data();
        const nextStatus = mapProviderStatus(body);
        const patch: Record<string, any> = {
            providerOrderId: orderId || order.providerOrderId || null,
            providerStatusCode: body.statuscode || null,
            providerStatus: body.orderstatus || body.status || null,
            providerRemark: body.orderremark || body.remark || null,
            providerResponse: { ...(order.providerResponse || {}), callback: body },
            updatedAt: FieldValue.serverTimestamp(),
        };
        if (!shouldPreserveSuccessful(order.fulfillmentStatus, nextStatus)) patch.fulfillmentStatus = nextStatus;

        await doc.ref.update(patch);
        await updateProviderHealth(order.network, order.type, nextStatus === 'REFUND_REQUIRED' || nextStatus === 'FAILED' ? 'failure' : 'success');
        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('[Clubkonnect Callback]', error);
        return res.status(500).json({ error: 'Callback handling failed' });
    }
}
