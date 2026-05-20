import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../server/firebase-admin.js';

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

        const isMartOrder = orderData.orderType === 'mart' || orderData.type === 'mart';

        // ─── Order Window Validation (food orders only) ───
        let batchInfo: { batchId: string; batchName: string; deliveryWindowStart: string; deliveryWindowEnd: string; batchDayId: string } | null = null;

        if (!isMartOrder) {
            const settingsSnap = await db.collection('settings').doc('platform').get();
            const settings = settingsSnap.exists ? settingsSnap.data()! : {};

            if (settings.orderWindowsEnabled === true && settings.orderWindowManualOverride !== true) {
                // Read batch schedules
                const batchConfigSnap = await db.collection('settings').doc('food_batches').get();
                const schedules = batchConfigSnap.exists
                    ? (batchConfigSnap.data()!.schedules || [])
                    : [];

                const now = new Date();
                const nowMinutes = now.getHours() * 60 + now.getMinutes();

                // Find active batch (open order window)
                let activeBatch = schedules.find((s: any) => {
                    if (!s.isActive) return false;
                    const [startH, startM] = s.orderWindowStart.split(':').map(Number);
                    const [endH, endM] = s.orderWindowEnd.split(':').map(Number);
                    const start = startH * 60 + startM;
                    const end = endH * 60 + endM;
                    return nowMinutes >= start && nowMinutes < end;
                });

                // If no active batch, check grace period
                if (!activeBatch) {
                    activeBatch = schedules.find((s: any) => {
                        if (!s.isActive) return false;
                        const [endH, endM] = s.orderWindowEnd.split(':').map(Number);
                        const closeTime = new Date(now);
                        closeTime.setHours(endH, endM, 0, 0);
                        const diff = now.getTime() - closeTime.getTime();
                        return diff > 0 && diff <= GRACE_PERIOD_MS;
                    });

                    if (!activeBatch) {
                        // Find next batch for client-side display
                        const sortedSchedules = schedules
                            .filter((s: any) => s.isActive)
                            .sort((a: any, b: any) => {
                                const aMin = parseInt(a.orderWindowStart.split(':')[0]) * 60 + parseInt(a.orderWindowStart.split(':')[1]);
                                const bMin = parseInt(b.orderWindowStart.split(':')[0]) * 60 + parseInt(b.orderWindowStart.split(':')[1]);
                                return aMin - bMin;
                            });
                        const nextBatch = sortedSchedules.find((s: any) => {
                            const [startH, startM] = s.orderWindowStart.split(':').map(Number);
                            return (startH * 60 + startM) > nowMinutes;
                        }) || sortedSchedules[0] || null;

                        return res.status(400).json({
                            error: 'ORDER_WINDOW_CLOSED',
                            message: 'No order window is currently open',
                            nextBatch: nextBatch ? {
                                id: nextBatch.id,
                                batchName: nextBatch.batchName,
                                orderWindowStart: nextBatch.orderWindowStart,
                                deliveryWindowStart: nextBatch.deliveryWindowStart,
                                deliveryWindowEnd: nextBatch.deliveryWindowEnd,
                            } : null,
                        });
                    }
                }

                // Check capacity
                const todayStr = now.toLocaleDateString('en-CA');
                const batchDayId = `${todayStr}_${activeBatch.id}`;
                const batchDayRef = db.collection('food_batch_days').doc(batchDayId);
                const batchDaySnap = await batchDayRef.get();

                let batchDayData = batchDaySnap.exists ? batchDaySnap.data()! : null;

                if (batchDayData) {
                    const totalSlots = (batchDayData.confirmedOrders || 0) + (batchDayData.reservedSlots || 0);
                    const maxOrders = batchDayData.maxOrders || activeBatch.maxOrdersPerBatch || 999;

                    if (totalSlots >= maxOrders) {
                        // Find next available batch
                        const sortedSchedules = schedules
                            .filter((s: any) => s.isActive && s.id !== activeBatch!.id)
                            .sort((a: any, b: any) => {
                                const aMin = parseInt(a.orderWindowStart.split(':')[0]) * 60 + parseInt(a.orderWindowStart.split(':')[1]);
                                const bMin = parseInt(b.orderWindowStart.split(':')[0]) * 60 + parseInt(b.orderWindowStart.split(':')[1]);
                                return aMin - bMin;
                            });
                        const nextBatch = sortedSchedules.find((s: any) => {
                            const [startH, startM] = s.orderWindowStart.split(':').map(Number);
                            return (startH * 60 + startM) > nowMinutes;
                        }) || sortedSchedules[0] || null;

                        return res.status(400).json({
                            error: 'BATCH_FULL',
                            message: `${activeBatch.batchName} has reached capacity`,
                            nextBatch: nextBatch ? {
                                id: nextBatch.id,
                                batchName: nextBatch.batchName,
                                orderWindowStart: nextBatch.orderWindowStart,
                                deliveryWindowStart: nextBatch.deliveryWindowStart,
                                deliveryWindowEnd: nextBatch.deliveryWindowEnd,
                            } : null,
                        });
                    }
                }

                // Reserve a slot atomically
                if (!batchDayData) {
                    // Create the batch day doc
                    await batchDayRef.set({
                        date: todayStr,
                        batchId: activeBatch.id,
                        batchName: activeBatch.batchName,
                        orderWindowStart: activeBatch.orderWindowStart,
                        orderWindowEnd: activeBatch.orderWindowEnd,
                        deliveryWindowStart: activeBatch.deliveryWindowStart,
                        deliveryWindowEnd: activeBatch.deliveryWindowEnd,
                        confirmedOrders: 0,
                        reservedSlots: 1,
                        maxOrders: activeBatch.maxOrdersPerBatch || 72,
                        status: 'OPEN',
                        revenue: 0,
                        hostelCounts: {},
                        cafeteriaCounts: {},
                        pendingReservations: [{
                            reference,
                            reservedAt: Date.now(),
                        }],
                    });
                } else {
                    // Increment reserved slots
                    await batchDayRef.update({
                        reservedSlots: FieldValue.increment(1),
                        pendingReservations: FieldValue.arrayUnion({
                            reference,
                            reservedAt: Date.now(),
                        }),
                    });
                }

                batchInfo = {
                    batchId: activeBatch.id,
                    batchName: activeBatch.batchName,
                    deliveryWindowStart: activeBatch.deliveryWindowStart,
                    deliveryWindowEnd: activeBatch.deliveryWindowEnd,
                    batchDayId,
                };
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
            fullName: orderData.fullName || '',
            studentName: orderData.studentName || orderData.fullName || '',
            phone: orderData.phone || '',
            hostel: orderData.hostel || '',
            hostelName: orderData.hostelName || '',
            instructions: orderData.instructions || '',
            total: isMartOrder ? undefined : (orderData.total || 0),
            cafeteria: orderData.cafeteria || '',
            cafeteriaId: orderData.cafeteriaId || '',
            sectionId: orderData.sectionId || 'none',
            deliveryMode: orderData.deliveryMode || 'solo',
            paymentReference: reference,
            assignedRiderId: null,
            batchId: null,
            status: 'PENDING_PAYMENT',
            source: 'pre_saved',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        // Add batch info if order windows are active
        if (batchInfo) {
            orderDoc.foodBatchId = batchInfo.batchId;
            orderDoc.foodBatchName = batchInfo.batchName;
            orderDoc.deliveryWindowStart = batchInfo.deliveryWindowStart;
            orderDoc.deliveryWindowEnd = batchInfo.deliveryWindowEnd;
            orderDoc.foodBatchDayId = batchInfo.batchDayId;
        }

        // Handle mart, combo, and regular food orders
        if (isMartOrder) {
            orderDoc.type = 'mart';
            orderDoc.items = orderData.items || [];
            orderDoc.totalAmount = orderData.totalAmount || orderData.total || 0;
            orderDoc.subtotal = orderData.subtotal || 0;
            orderDoc.deliveryFee = orderData.deliveryFee || 1500;
            orderDoc.serviceProcessingFee = orderData.serviceProcessingFee || 300;
            delete orderDoc.total;
            delete orderDoc.cafeteria;
            delete orderDoc.cafeteriaId;
            delete orderDoc.sectionId;
            delete orderDoc.deliveryMode;
        } else if (orderData.type === 'combo') {
            orderDoc.type = 'combo';
            orderDoc.comboId = orderData.comboId;
            orderDoc.comboName = orderData.comboName;
            orderDoc.comboItems = orderData.comboItems || [];
            orderDoc.quantity = orderData.quantity || 1;
            orderDoc.plateCount = orderData.quantity || 1;
            orderDoc.basePrice = orderData.basePrice || 0;
        } else {
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
