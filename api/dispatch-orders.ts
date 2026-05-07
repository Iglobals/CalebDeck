import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyAdmin } from '../server/verify-admin.js';

// Init Firebase Admin
if (getApps().length === 0) {
    const projectId = process.env.FB_SA_PROJECT_ID;
    const clientEmail = process.env.FB_SA_CLIENT_EMAIL;
    let privateKey = process.env.FB_SA_PRIVATE_KEY || '';
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
        initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    }
}

const db = getApps().length > 0 ? getFirestore() : null;

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        if (!db) {
            return res.status(500).json({ error: 'Firebase not configured — check FB_SA env vars on Vercel' });
        }

        // Admin authentication required
        const admin = await verifyAdmin(req);
        if (!admin) {
            return res.status(401).json({ error: 'Unauthorized — admin access required' });
        }

        const { hostelId } = req.body;
        if (!hostelId) {
            return res.status(400).json({ error: 'hostelId is required' });
        }

        const ordersSnap = await db.collection('orders').where('hostel', '==', hostelId).where('status', '==', 'PAID').get();

        if (ordersSnap.empty) {
            return res.status(200).json({ data: { success: true, message: 'No orders to dispatch', count: 0 } });
        }

        // Chunk batch writes to stay under Firestore 500-op limit
        const BATCH_LIMIT = 499;
        const docs = ordersSnap.docs;
        for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
            const chunk = docs.slice(i, i + BATCH_LIMIT);
            const batch = db.batch();
            chunk.forEach(doc => {
                batch.update(doc.ref, { status: 'PREPARING', updatedAt: FieldValue.serverTimestamp() });
            });
            await batch.commit();
        }

        return res.status(200).json({
            data: { success: true, message: `${ordersSnap.size} orders dispatched`, count: ordersSnap.size }
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to dispatch orders', details: error.message });
    }
}
