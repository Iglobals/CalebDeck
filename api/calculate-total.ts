import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from '../server/firebase-admin.js';

const DELIVERY_FEE_SOLO = 750;
const DELIVERY_FEE_GROUP = 580;
const TAKEAWAY_FEE_PER_PLATE = 200;

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const db = adminDb();
        if (false) {
            return res.status(500).json({ error: 'Firebase not configured — check FB_SA env vars on Vercel' });
        }

        const { items, deliveryMode, plateCount: providedPlateCount, hostelId } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        // FIXED: Fetch platform settings and items separately to avoid Promise.all destructuring bug
        const settingsDoc = await db.collection('settings').doc('platform').get();
        const itemRefs = items.map((i: any) => db!.collection('menu_items').doc(i.id));
        const itemDocs = await db.getAll(...itemRefs);

        const platformSettings = settingsDoc.exists ? settingsDoc.data() : {};
        const premiumDeliveryFee = platformSettings!.premiumDeliveryFee || 1250;

        let foodTotal = 0;
        
        for (let idx = 0; idx < itemDocs.length; idx++) {
            const doc = itemDocs[idx];
            const qty = items[idx].quantity || 1;
            let currentPrice = 0;

            if (doc.exists) {
                currentPrice = doc.data()!.price || 0;
            } else {
                console.warn(`[calculate-total] Item not found: ${items[idx].id}, using client price: ${items[idx].price}`);
                currentPrice = items[idx].price || 0;
            }
            
            // Add ₦50 markup for addons under ₦1000
            if (items[idx].isAddon && currentPrice < 1000) {
                currentPrice += 50;
            }
            
            foodTotal += currentPrice * qty;
        }

        const plateCount = typeof providedPlateCount === 'number' ? providedPlateCount : 1;
        const isGroup = deliveryMode === 'group' || deliveryMode === 'GROUP';
        const isPremiumHostel = ['sussana', 'rebecca', 'mary', 'esme', 'deborah', 'mercy'].includes((hostelId || '').toString().toLowerCase());
        
        // FIXED: Use base delivery fee for breakdown, and correctly calculate discount without double-discounting
        const baseDeliveryFee = isPremiumHostel ? premiumDeliveryFee : DELIVERY_FEE_SOLO;
        let discountPerPlate = 0;
        if (isGroup) {
             discountPerPlate = isPremiumHostel ? (premiumDeliveryFee - Math.round(premiumDeliveryFee * 0.8)) : (DELIVERY_FEE_SOLO - DELIVERY_FEE_GROUP);
        }

        const deliveryFee = baseDeliveryFee * plateCount;
        const takeawayFee = TAKEAWAY_FEE_PER_PLATE * plateCount;
        const discount = discountPerPlate * plateCount;
        
        const platformFee = 100;
        const processingFee = 200;

        const totalAmount = foodTotal + deliveryFee + takeawayFee + platformFee + processingFee - discount;

        return res.status(200).json({
            data: {
                totalAmount,
                breakdown: { 
                    food: foodTotal, 
                    delivery: deliveryFee, 
                    takeaway: takeawayFee, 
                    platform: platformFee,
                    processing: processingFee,
                    discount 
                },
            }
        });
    } catch (error: any) {
        console.error('[calculate-total] Error:', error);
        return res.status(500).json({ error: 'Failed to calculate total', details: error.message });
    }
}
