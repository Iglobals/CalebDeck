import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from '../server/firebase-admin.js';
import { isPremiumHostel } from '../src/services/orderFees.js';
import { GroupOrderError, premiumGroupDeliveryFee, resolveFoodGroupPricing } from '../src/services/groupPricing.js';
import { isRateLimited, clientIp } from '../server/rate-limit.js';
import { recordEvent, monitoringFromError } from '../server/monitoring.js';

const TAKEAWAY_FEE_PER_PLATE = 200;

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (isRateLimited(`calculate-total:${clientIp(req)}`, 30, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    try {
        const db = adminDb();
        if (false) {
            return res.status(500).json({ error: 'Firebase not configured — check FB_SA env vars on Vercel' });
        }

        const { items, deliveryMode, plateCount: providedPlateCount, hostelId, groupSize } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        // FIXED: Fetch platform settings and items separately to avoid Promise.all destructuring bug
        const settingsDoc = await db.collection('settings').doc('platform').get();
        const hostelSnap = hostelId
            ? await db.collection('hostels').doc(String(hostelId)).get().catch(() => null)
            : null;
        const itemRefs = items.map((i: any) => db!.collection('menu_items').doc(i.id));
        const itemDocs = await db.getAll(...itemRefs);

        const platformSettings = settingsDoc.exists ? settingsDoc.data() : {};
        const firestoreHostels = hostelSnap && hostelSnap.exists ? [{ id: hostelSnap.id, ...hostelSnap.data() }] : undefined;
        const premiumDeliveryFee = platformSettings!.premiumDeliveryFee || 1250;
        const foodSoloFee = platformSettings!.foodDeliveryFee || 750;
        const foodGroupFee = platformSettings!.foodGroupDeliveryFee || 580;

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

        const foodGroup = resolveFoodGroupPricing({
            deliveryMode,
            groupSize,
            plateCount: providedPlateCount,
        });
        const plateCount = foodGroup.plateCount;
        const isGroup = foodGroup.isGroup;
        const isPremium = isPremiumHostel(hostelId, platformSettings, firestoreHostels);

        const baseDeliveryFee = isPremium ? premiumDeliveryFee : foodSoloFee;
        let discountPerPlate = 0;
        if (isGroup) {
             discountPerPlate = isPremium ? (premiumDeliveryFee - premiumGroupDeliveryFee(premiumDeliveryFee)) : (foodSoloFee - foodGroupFee);
        }

        const deliveryFee = baseDeliveryFee * plateCount;
        const takeawayFee = TAKEAWAY_FEE_PER_PLATE * plateCount;
        const discount = discountPerPlate * plateCount;

        const totalAmount = foodTotal + deliveryFee + takeawayFee - discount;

        return res.status(200).json({
            data: {
                totalAmount,
                breakdown: {
                    food: foodTotal,
                    delivery: deliveryFee,
                    takeaway: takeawayFee,
                    processing: 0,
                    discount
                },
            }
        });
    } catch (error: any) {
        if (error instanceof GroupOrderError || error?.code === 'GROUP_SIZE_INVALID') {
            return res.status(400).json({ error: error.code || 'GROUP_SIZE_INVALID', message: error.message });
        }
        console.error('[calculate-total] Error:', error);
        const parsed = monitoringFromError(error);
        await recordEvent({
            severity: 'high',
            category: 'application',
            service: 'checkout',
            eventType: 'api_failure',
            humanTitle: 'Checkout total could not be calculated',
            humanSummary: 'Customers may be unable to complete checkout because the server could not calculate the order total.',
            suggestedAction: 'Check Firebase menu prices and the calculate-total function logs.',
            errorMessage: parsed.message,
            errorCode: parsed.errorCode || 'CALCULATE_TOTAL_FAILED',
            stack: parsed.stack,
            endpoint: '/api/calculate-total',
            httpStatus: 500,
        });
        return res.status(500).json({ error: 'Failed to calculate total' });
    }
}
