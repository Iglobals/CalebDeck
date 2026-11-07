import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from '../server/firebase-admin.js';
import { calculateServerOrderTotal } from '../server/order-utils.js';
import { GroupOrderError } from '../src/services/groupPricing.js';
import { isRateLimited, clientIp } from '../server/rate-limit.js';
import { recordEvent, monitoringFromError } from '../server/monitoring.js';

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

        const { items, plates, drinksSnacks, deliveryMode, plateCount: providedPlateCount, hostelId, groupSize, deliveryType } = req.body;

        const hasItems = Array.isArray(items) && items.length > 0;
        const hasPlates = Array.isArray(plates) && plates.length > 0;
        if (!hasItems && !hasPlates) {
            return res.status(400).json({ error: 'No items provided' });
        }

        const { serverTotal, breakdown } = await calculateServerOrderTotal(db, {
            orderType: 'FOOD',
            type: 'plate',
            items,
            plates,
            drinksSnacks,
            deliveryMode,
            groupSize,
            plateCount: providedPlateCount,
            hostelId,
            deliveryType,
        });

        return res.status(200).json({
            data: {
                totalAmount: serverTotal,
                breakdown: breakdown || {
                    food: serverTotal,
                    delivery: 0,
                    takeaway: 0,
                    processing: 0,
                    discount: 0,
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
