import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from './_firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { hostelId } = req.body;

        if (!hostelId) {
            return res.status(400).json({ error: 'hostelId is required' });
        }

        // Get all PAID orders for this hostel
        const ordersSnap = await adminDb
            .collection('orders')
            .where('hostel', '==', hostelId)
            .where('status', '==', 'PAID')
            .get();

        if (ordersSnap.empty) {
            return res.status(200).json({
                data: { success: true, message: 'No orders to dispatch', count: 0 }
            });
        }

        // Batch update all to PREPARING
        const batch = adminDb.batch();
        ordersSnap.docs.forEach(doc => {
            batch.update(doc.ref, {
                status: 'PREPARING',
                updatedAt: new Date().toISOString(),
            });
        });
        await batch.commit();

        console.log(`[dispatch-orders] Dispatched ${ordersSnap.size} orders for hostel: ${hostelId}`);

        return res.status(200).json({
            data: {
                success: true,
                message: `${ordersSnap.size} orders dispatched for preparation`,
                count: ordersSnap.size,
            }
        });
    } catch (error: any) {
        console.error('[dispatch-orders] Error:', error.message);
        return res.status(500).json({ error: 'Failed to dispatch orders' });
    }
}
