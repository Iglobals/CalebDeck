import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Inline Firebase Admin init (Vercel isolates each function — no shared modules)
if (!admin.apps.length) {
    const projectId = process.env.FB_SA_PROJECT_ID;
    const clientEmail = process.env.FB_SA_CLIENT_EMAIL;
    let privateKey = process.env.FB_SA_PRIVATE_KEY || '';
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
        admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    }
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        if (!db) {
            return res.status(500).json({ error: 'Firebase not configured — check FB_SA env vars on Vercel' });
        }

        const { hostelId } = req.body;
        if (!hostelId) {
            return res.status(400).json({ error: 'hostelId is required' });
        }

        const ordersSnap = await db.collection('orders').where('hostel', '==', hostelId).where('status', '==', 'PAID').get();

        if (ordersSnap.empty) {
            return res.status(200).json({ data: { success: true, message: 'No orders to dispatch', count: 0 } });
        }

        const batch = db.batch();
        ordersSnap.docs.forEach(doc => {
            batch.update(doc.ref, { status: 'PREPARING', updatedAt: new Date().toISOString() });
        });
        await batch.commit();

        return res.status(200).json({
            data: { success: true, message: `${ordersSnap.size} orders dispatched`, count: ordersSnap.size }
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to dispatch orders', details: error.message });
    }
}
