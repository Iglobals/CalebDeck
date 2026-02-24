import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from './_firebase-admin';

const DELIVERY_FEE_SOLO = 700;
const DELIVERY_FEE_GROUP = 560;
const TAKEAWAY_FEE_PER_PLATE = 200;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Check if Firebase Admin is initialized
        if (!adminDb) {
            console.error('[calculate-total] Firebase Admin not initialized — check FIREBASE_SERVICE_ACCOUNT env var');
            return res.status(500).json({ error: 'Server configuration error. Check Vercel logs.' });
        }

        const { items, deliveryMode, hostelId } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        console.log(`[calculate-total] Processing ${items.length} items, deliveryMode: ${deliveryMode}`);

        // Look up REAL prices from Firestore (prevents client-side price manipulation)
        let foodTotal = 0;
        let plateCount = 0;

        for (const item of items) {
            const docRef = adminDb.collection('menu_items').doc(item.id);
            const doc = await docRef.get();

            if (!doc.exists) {
                console.warn(`[calculate-total] Item not found in Firestore: "${item.id}" — using client price ₦${item.price || 0} as fallback`);
                // Fallback to client-provided price if item not found (e.g. old random IDs)
                const qty = item.quantity || 1;
                foodTotal += (item.price || 0) * qty;
                plateCount += qty;
                continue;
            }

            const data = doc.data()!;
            const realPrice = data.price || 0;
            const qty = item.quantity || 1;

            foodTotal += realPrice * qty;
            plateCount += qty;
            console.log(`[calculate-total] Item "${data.name}" — ₦${realPrice} x ${qty}`);
        }

        // Calculate fees
        const isGroup = deliveryMode === 'group' || deliveryMode === 'GROUP';
        const deliveryFeePerPlate = isGroup ? DELIVERY_FEE_GROUP : DELIVERY_FEE_SOLO;
        const deliveryFee = deliveryFeePerPlate * plateCount;
        const takeawayFee = TAKEAWAY_FEE_PER_PLATE * plateCount;
        const discount = isGroup ? (DELIVERY_FEE_SOLO - DELIVERY_FEE_GROUP) * plateCount : 0;
        const totalAmount = foodTotal + deliveryFee + takeawayFee;

        // Generate a simple verification token
        const token = Buffer.from(`${totalAmount}-${Date.now()}-${plateCount}`).toString('base64');

        console.log(`[calculate-total] ✓ Food: ₦${foodTotal}, Delivery: ₦${deliveryFee}, Takeaway: ₦${takeawayFee}, Total: ₦${totalAmount}`);

        return res.status(200).json({
            data: {
                totalAmount,
                breakdown: {
                    food: foodTotal,
                    delivery: deliveryFee,
                    takeaway: takeawayFee,
                    discount,
                },
                token,
            }
        });
    } catch (error: any) {
        console.error('[calculate-total] Error:', error.message, error.stack);
        return res.status(500).json({ error: 'Failed to calculate total', details: error.message });
    }
}
