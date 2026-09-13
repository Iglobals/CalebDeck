import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../server/firebase-admin.js';
import { resolveOrderVertical } from '../src/services/orderVertical.js';
import { isRateLimited, clientIp } from '../server/rate-limit.js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';
const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes grace after window closes

/**
 * PRE-SAVE ORDER
 * 
 * Called BEFORE Paystack payment to save the complete order data
 * (plates, items, student info) to Firestore with status PENDING_PAYMENT.
 * 
 * NEW: If order windows are enabled, validates:
 * 1. An order window is currently open (or within grace period)
 * 2. The batch is not at max capacity
 * 3. Reserves a slot atomically (decremented on payment failure)
 * 
 * This ensures the order data is never lost, even if:
 * - verify-payment fails (network issue)
 * - webhook creates a skeleton (no items in Paystack metadata)
 * - student's phone loses connection after payment
 * 
 * Both verify-payment and webhook will find this doc and just update the status.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (isRateLimited(`pre-save:${clientIp(req)}`, 20, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    try {
        const db = adminDb();

        const { reference, orderData } = req.body;

        if (!reference || !orderData) {
            return res.status(400).json({ error: 'reference and orderData are required' });
        }

        // Don't overwrite if a completed order already exists
        const orderRef = db.collection('orders').doc(reference);
        const existing = await orderRef.get();

        if (existing.exists) {
            const data = existing.data()!;
            if (data.status !== 'PENDING_PAYMENT') {
                // Already processed — don't overwrite
                return res.status(200).json({ success: true, message: 'Order already exists' });
            }
        }

        const vertical = resolveOrderVertical(orderData);
        const isMartOrder = vertical === 'MART';
        const isFashionOrder = vertical === 'FASHION';

        // ─── Delivery Type Validation (food orders only — fashion batches are managed separately) ───
        let batchInfo: {
            batchId: string;
            batchName: string;
            orderWindowStart: string;
            orderWindowEnd: string;
            deliveryWindowStart: string;
            deliveryWindowEnd: string;
            batchDayId: string;
        } | null = null;
        const deliveryType = orderData.deliveryType || 'INSTANT';

        if (vertical === 'FOOD') {
            const settingsSnap = await db.collection('settings').doc('platform').get();
            const settings = settingsSnap.exists ? settingsSnap.data()! : {};

            if (deliveryType === 'BATCH' && settings.orderWindowsEnabled === true) {
                // Read batch schedules
                const batchConfigSnap = await db.collection('settings').doc('food_batches').get();
                const schedules = batchConfigSnap.exists
                    ? (batchConfigSnap.data()!.schedules || [])
                    : [];

                const now = new Date();
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                const selectedBatchId = orderData.selectedBatchId;

                if (!selectedBatchId) {
                    return res.status(400).json({ error: 'BATCH_ID_MISSING', message: 'No batch selected' });
                }

                const targetBatch = schedules.find((s: any) => s.id === selectedBatchId && s.isActive);
                
                if (!targetBatch) {
                    return res.status(400).json({ error: 'BATCH_NOT_FOUND', message: 'Selected batch is invalid or inactive' });
                }

                // Check if batch is currently open OR if future pre-orders are allowed
                const [startH, startM] = targetBatch.orderWindowStart.split(':').map(Number);
                const [endH, endM] = targetBatch.orderWindowEnd.split(':').map(Number);
                const start = startH * 60 + startM;
                const end = endH * 60 + endM;
                
                const isOpen = nowMinutes >= start && nowMinutes < end;
                const isUpcoming = nowMinutes < start;
                const isGracePeriod = (nowMinutes - end) * 60 * 1000 <= GRACE_PERIOD_MS;
                const allowPreorder = settings.allowFutureBatchPreorders === true;

                if (!isOpen && !isGracePeriod && !(isUpcoming && allowPreorder)) {
                    return res.status(400).json({
                        error: 'ORDER_WINDOW_CLOSED',
                        message: 'The selected batch is closed',
                    });
                }

                // Check capacity & atomic reservation
                const todayStr = now.toLocaleDateString('en-CA');
                const batchDayId = `${todayStr}_${targetBatch.id}`;
                const batchDayRef = db.collection('food_batch_days').doc(batchDayId);
                
                // Run transaction to safely expire old reservations and check capacity
                try {
                    await db.runTransaction(async (transaction) => {
                        const batchDaySnap = await transaction.get(batchDayRef);
                        let batchDayData = batchDaySnap.exists ? batchDaySnap.data()! : null;

                        if (batchDayData) {
                            // Expire old reservations (older than 10 mins)
                            const TEN_MINS = 10 * 60 * 1000;
                            const pendingReservations = batchDayData.pendingReservations || [];
                            const nowTime = Date.now();
                            
                            const validReservations = pendingReservations.filter((res: any) => 
                                (nowTime - res.reservedAt) <= TEN_MINS
                            );
                            
                            const expiredCount = pendingReservations.length - validReservations.length;
                            
                            // Re-calculate active reserved slots based on valid reservations array
                            // This ensures reservedSlots never goes negative and is always perfectly in sync
                            let updatedReservedSlots = validReservations.length;
                            const confirmedOrders = batchDayData.confirmedOrders || 0;
                            const totalSlots = confirmedOrders + updatedReservedSlots;
                            const maxOrders = batchDayData.maxOrders || targetBatch.maxOrdersPerBatch || 999;

                            if (totalSlots >= maxOrders) {
                                throw new Error('BATCH_FULL');
                            }

                            // We have capacity, reserve a slot
                            updatedReservedSlots += 1;
                            validReservations.push({ reference, reservedAt: nowTime });

                            transaction.update(batchDayRef, {
                                reservedSlots: updatedReservedSlots,
                                pendingReservations: validReservations
                            });
                        } else {
                            // Create the batch day doc
                            transaction.set(batchDayRef, {
                                date: todayStr,
                                batchId: targetBatch.id,
                                batchName: targetBatch.batchName,
                                orderWindowStart: targetBatch.orderWindowStart,
                                orderWindowEnd: targetBatch.orderWindowEnd,
                                deliveryWindowStart: targetBatch.deliveryWindowStart,
                                deliveryWindowEnd: targetBatch.deliveryWindowEnd,
                                confirmedOrders: 0,
                                reservedSlots: 1,
                                maxOrders: targetBatch.maxOrdersPerBatch || 72,
                                status: 'OPEN',
                                revenue: 0,
                                hostelCounts: {},
                                cafeteriaCounts: {},
                                pendingReservations: [{
                                    reference,
                                    reservedAt: Date.now(),
                                }],
                            });
                        }
                    });
                } catch (transactionErr: any) {
                    if (transactionErr.message === 'BATCH_FULL') {
                        return res.status(400).json({
                            error: 'BATCH_FULL',
                            message: `${targetBatch.batchName} has reached capacity`,
                        });
                    }
                    throw transactionErr;
                }

                batchInfo = {
                    batchId: targetBatch.id,
                    batchName: targetBatch.batchName,
                    orderWindowStart: targetBatch.orderWindowStart,
                    orderWindowEnd: targetBatch.orderWindowEnd,
                    deliveryWindowStart: targetBatch.deliveryWindowStart,
                    deliveryWindowEnd: targetBatch.deliveryWindowEnd,
                    batchDayId,
                };
            }
            
            if (deliveryType === 'INSTANT') {
                const instantEnabled = settings.instantOrderingEnabled !== false;
                const maxInstant = settings.maxActiveInstantOrders || 999;
                const instantOverloadBehavior = settings.instantOverloadBehavior || 'WARN';
                
                if (!instantEnabled) {
                    return res.status(400).json({ error: 'INSTANT_THROTTLED', message: 'Instant ordering is disabled' });
                }

                if (instantOverloadBehavior === 'BLOCK') {
                    // Count active instant orders
                    const qSafe = db.collection('orders').where('status', 'in', ['PAID', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'ON_THE_WAY']);
                    const snapshotSafe = await qSafe.get();
                    let activeCount = 0;
                    snapshotSafe.forEach(doc => {
                        const data = doc.data();
                        if (data.deliveryType === 'INSTANT' || !data.deliveryType) {
                            activeCount++;
                        }
                    });
                    
                    if (activeCount >= maxInstant) {
                        return res.status(400).json({ error: 'INSTANT_THROTTLED', message: 'Instant ordering is at full capacity' });
                    }
                }
            }
        }

        // Strip base64 images from plates (same safety as verify-payment)
        const cleanPlates = (orderData.plates || []).map((plate: any) => {
            const { image, ...rest } = plate;
            return {
                ...rest,
                items: (rest.items || []).map((item: any) => {
                    const { image: _, ...itemRest } = item;
                    return itemRest;
                })
            };
        });

        const cleanSnacks = (orderData.drinksSnacks || []).map((snack: any) => {
            const { image, ...rest } = snack;
            return rest;
        });

        const orderDoc: any = {
            orderId: orderData.orderId,
            userId: orderData.userId || orderData.iConId || null,
            fullName: orderData.fullName || '',
            studentName: orderData.studentName || orderData.fullName || '',
            phone: orderData.phone || '',
            hostel: orderData.hostel || '',
            hostelName: orderData.hostelName || '',
            instructions: orderData.instructions || '',
            total: (isMartOrder || isFashionOrder) ? undefined : (orderData.total || 0),
            cafeteria: orderData.cafeteria || '',
            cafeteriaId: orderData.cafeteriaId || '',
            sectionId: orderData.sectionId || 'none',
            deliveryMode: orderData.deliveryMode || 'solo',
            deliveryType: deliveryType,
            paymentReference: reference,
            assignedRiderId: null,
            batchId: null,
            status: 'PENDING_PAYMENT',
            source: 'pre_saved',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        // Add batch info if this is a batch order
        if (batchInfo) {
            orderDoc.foodBatchId = batchInfo.batchId;
            orderDoc.foodBatchName = batchInfo.batchName;
            orderDoc.orderWindowStart = batchInfo.orderWindowStart;
            orderDoc.orderWindowEnd = batchInfo.orderWindowEnd;
            orderDoc.deliveryWindowStart = batchInfo.deliveryWindowStart;
            orderDoc.deliveryWindowEnd = batchInfo.deliveryWindowEnd;
            orderDoc.foodBatchDayId = batchInfo.batchDayId;
        }

        // Handle fashion, mart, combo, and regular food orders — every branch
        // stamps both `type` (legacy marker) and `orderType` (explicit vertical)
        // so cold Firestore reads can always classify the order.
        if (isFashionOrder) {
            orderDoc.type = 'fashion';
            orderDoc.orderType = 'FASHION';
            orderDoc.items = orderData.items || [];
            orderDoc.totalAmount = orderData.totalAmount || orderData.total || 0;
            orderDoc.subtotal = orderData.subtotal || 0;
            orderDoc.deliveryFee = orderData.deliveryFee || 1500;
            orderDoc.fashionBatchName = orderData.fashionBatchName || null;
            orderDoc.expectedArrivalDate = orderData.expectedArrivalDate || null;
            orderDoc.fashionBatchStatus = orderData.fashionBatchStatus || null;
            delete orderDoc.total;
            delete orderDoc.cafeteria;
            delete orderDoc.cafeteriaId;
            delete orderDoc.sectionId;
            delete orderDoc.deliveryMode;
        } else if (isMartOrder) {
            orderDoc.type = 'mart';
            orderDoc.orderType = 'MART';
            orderDoc.items = orderData.items || [];
            orderDoc.totalAmount = orderData.totalAmount || orderData.total || 0;
            orderDoc.subtotal = orderData.subtotal || 0;
            orderDoc.deliveryFee = orderData.deliveryFee || 1500;
            delete orderDoc.total;
            delete orderDoc.cafeteria;
            delete orderDoc.cafeteriaId;
            delete orderDoc.sectionId;
            delete orderDoc.deliveryMode;
        } else if (orderData.type === 'combo') {
            orderDoc.type = 'combo';
            orderDoc.orderType = 'FOOD';
            orderDoc.comboId = orderData.comboId;
            orderDoc.comboName = orderData.comboName;
            orderDoc.comboItems = orderData.comboItems || [];
            orderDoc.quantity = orderData.quantity || 1;
            orderDoc.plateCount = orderData.quantity || 1;
            orderDoc.basePrice = orderData.basePrice || 0;
        } else {
            orderDoc.type = 'plate';
            orderDoc.orderType = 'FOOD';
            orderDoc.plates = cleanPlates;
            orderDoc.drinksSnacks = cleanSnacks;
            orderDoc.plateCount = orderData.plateCount || cleanPlates.length || 1;
        }

        await orderRef.set(orderDoc);
        console.log(`[pre-save] Saved order ${orderData.orderId} with ref: ${reference}${batchInfo ? ` [batch: ${batchInfo.batchName}]` : ''}`);

        return res.status(200).json({
            success: true,
            reference,
            ...(batchInfo ? { batch: batchInfo } : {}),
        });
    } catch (error: any) {
        console.error('[pre-save] Error:', error);
        return res.status(500).json({ error: 'Failed to pre-save order' });
    }
}
