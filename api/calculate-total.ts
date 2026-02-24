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
        const { items, deliveryMode, hostelId } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        // Look up REAL prices from Firestore (prevents client-side price manipulation)
        let foodTotal = 0;
        let plateCount = 0;

        for (const item of items) {
            const docRef = adminDb.collection('menu_items').doc(item.id);
            const doc = await docRef.get();

            if (!doc.exists) {
                console.warn(`[calculate-total] Item not found: ${item.id}`);
                continue;
            }

            const data = doc.data()!;
            const realPrice = data.price || 0;
            const qty = item.quantity || 1;

            foodTotal += realPrice * qty;
            plateCount += qty;
        }

        // Calculate fees
        const isGroup = deliveryMode === 'group' || deliveryMode === 'GROUP';
        const deliveryFeePerPlate = isGroup ? DELIVERY_FEE_GROUP : DELIVERY_FEE_SOLO;
        const deliveryFee = deliveryFeePerPlate * plateCount;
        const takeawayFee = TAKEAWAY_FEE_PER_PLATE * plateCount;
        const discount = isGroup ? (DELIVERY_FEE_SOLO - DELIVERY_FEE_GROUP) * plateCount : 0;
        const totalAmount = foodTotal + deliveryFee + takeawayFee;

        // Generate a simple verification token (timestamp + hash)
        const token = Buffer.from(`${totalAmount}-${Date.now()}-${plateCount}`).toString('base64');

        console.log(`[calculate-total] Food: ₦${foodTotal}, Delivery: ₦${deliveryFee}, Takeaway: ₦${takeawayFee}, Total: ₦${totalAmount}`);

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
        console.error('[calculate-total] Error:', error.message);
        return res.status(500).json({ error: 'Failed to calculate total' });
    }
}
