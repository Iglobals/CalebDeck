import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
        if (!db) {
            return res.status(500).json({ error: 'Firebase not configured — check FB_SA env vars on Vercel' });
        }

        const { items, deliveryMode, plateCount: providedPlateCount } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        // Parallel Firestore reads instead of sequential loop
        const itemRefs = items.map((i: any) => db!.collection('menu_items').doc(i.id));
        const itemDocs = await db.getAll(...itemRefs);

        let foodTotal = 0;
        let hasSmallAddon = false;
        
        for (let idx = 0; idx < itemDocs.length; idx++) {
            const doc = itemDocs[idx];
            const qty = items[idx].quantity || 1;
            let currentPrice = 0;

            if (doc.exists) {
                currentPrice = doc.data()!.price || 0;
            } else {
                // For drinks/snacks that may use different ID patterns, use client price
                // but log it for monitoring
                console.warn(`[calculate-total] Item not found: ${items[idx].id}, using client price: ${items[idx].price}`);
                currentPrice = items[idx].price || 0;
            }
            
            if (items[idx].isAddon && currentPrice < 1000) {
                hasSmallAddon = true;
            }
            
            foodTotal += currentPrice * qty;
        }

        const plateCount = typeof providedPlateCount === 'number' ? providedPlateCount : 1;

        const isGroup = deliveryMode === 'group' || deliveryMode === 'GROUP';
        const deliveryFee = (isGroup ? DELIVERY_FEE_GROUP : DELIVERY_FEE_SOLO) * plateCount;
        const takeawayFee = TAKEAWAY_FEE_PER_PLATE * plateCount;
        const discount = isGroup ? (DELIVERY_FEE_SOLO - DELIVERY_FEE_GROUP) * plateCount : 0;
        
        const platformFee = 100;
        const processingFee = 200;
        const cafeCharge = hasSmallAddon ? 50 : 0;

        const totalAmount = foodTotal + deliveryFee + takeawayFee + platformFee + processingFee + cafeCharge - discount;

        return res.status(200).json({
            data: {
                totalAmount,
                breakdown: { 
                    food: foodTotal, 
                    delivery: deliveryFee, 
                    takeaway: takeawayFee, 
                    platform: platformFee,
                    processing: processingFee,
                    cafeCharge,
                    discount 
                },
            }
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to calculate total', details: error.message });
    }
}
