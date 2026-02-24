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

const DELIVERY_FEE_SOLO = 700;
const DELIVERY_FEE_GROUP = 560;
const TAKEAWAY_FEE_PER_PLATE = 200;

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

        const { items, deliveryMode } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        let foodTotal = 0;
        let plateCount = 0;

        for (const item of items) {
            const docRef = db.collection('menu_items').doc(item.id);
            const doc = await docRef.get();

            if (!doc.exists) {
                // Fallback to client price for items with old random IDs
                const qty = item.quantity || 1;
                foodTotal += (item.price || 0) * qty;
                plateCount += qty;
                continue;
            }

            const data = doc.data()!;
            const qty = item.quantity || 1;
            foodTotal += (data.price || 0) * qty;
            plateCount += qty;
        }

        const isGroup = deliveryMode === 'group' || deliveryMode === 'GROUP';
        const deliveryFee = (isGroup ? DELIVERY_FEE_GROUP : DELIVERY_FEE_SOLO) * plateCount;
        const takeawayFee = TAKEAWAY_FEE_PER_PLATE * plateCount;
        const discount = isGroup ? (DELIVERY_FEE_SOLO - DELIVERY_FEE_GROUP) * plateCount : 0;
        const totalAmount = foodTotal + deliveryFee + takeawayFee;
        const token = Buffer.from(`${totalAmount}-${Date.now()}-${plateCount}`).toString('base64');

        return res.status(200).json({
            data: {
                totalAmount,
                breakdown: { food: foodTotal, delivery: deliveryFee, takeaway: takeawayFee, discount },
                token,
            }
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to calculate total', details: error.message });
    }
}
