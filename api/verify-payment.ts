import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';
import { adminDb } from '../server/firebase-admin.js';
import { confirmFoodBatchReservation } from '../server/food-batch.js';
import { calculateServerOrderTotal } from '../server/order-utils.js';
import { claimFirstOrderDiscount, mergeDiscountOntoOrder } from '../server/first-order-discount.js';
import { resolveOrderVertical } from '../src/services/orderVertical.js';
import { isRateLimited, clientIp } from '../server/rate-limit.js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (isRateLimited(`verify-payment:${clientIp(req)}`, 20, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    try {
        const db = adminDb();
        if (false) {
            return res.status(500).json({ error: 'Firebase not configured — check FB_SA env vars on Vercel' });
        }

        const { reference, orderData } = req.body;

        if (!reference) {
            return res.status(400).json({ error: 'Payment reference is required' });
        }

        // Server-side operating hours check (10am–6pm WAT = UTC+1)
        const now = new Date();
        const watHour = (now.getUTCHours() + 1) % 24;
        if (watHour < 10 || watHour >= 18) {
            console.warn(`[verify-payment] Order attempt outside hours: ${watHour}:00 WAT, ref=${reference}`);
            // Don't block — log and proceed. The payment already went through on Paystack.
            // Blocking here would leave the user with a paid but unprocessed order.
        }

        // 1. Check if order already exists
        const vertical = resolveOrderVertical(orderData);
        const isMartOrder = vertical === 'MART';
        const isCombo = orderData?.type === 'combo';
        const isFashionOrder = vertical === 'FASHION';
        const orderRef = db.collection('orders').doc(reference);
        const existingDoc = await orderRef.get();

        if (existingDoc.exists) {
            const existingData = existingDoc.data()!;

            // Already fully verified — true idempotency
            if (existingData.source === 'verified') {
                return res.status(200).json({
                    data: {
                        success: true,
                        message: 'Order already exists',
                        firestoreOrderId: existingDoc.id,
                        orderId: existingData.orderId
                    }
                });
            }

            // Pre-saved order (items already in DB) - verify payment then flip status.
            // Allow FAILED too because a failed Paystack event can arrive before a later
            // successful confirmation for the same saved reference.
            if (existingData.source === 'pre_saved' && ['PENDING_PAYMENT', 'FAILED'].includes(existingData.status)) {
                console.log(`[verify-payment] Found pre-saved order for ref: ${reference}, verifying payment...`);
                // Don't return yet — fall through to verify with Paystack, then update status
            }

            // Webhook skeleton — fall through to overwrite with full data
            if (existingData.source === 'webhook') {
                console.log(`[verify-payment] Overwriting webhook skeleton for ref: ${reference}`);
            }
        }

        // 2. Verify with Paystack
        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!secretKey) {
            return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY not configured on Vercel' });
        }

        const paystackResponse = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            { headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' } }
        );

        const { data } = paystackResponse.data;

        if (data.status !== 'success') {
            if (existingDoc.exists) {
                await orderRef.set({
                    status: 'FAILED',
                    paymentStatus: data.status || 'failed',
                    paymentMessage: data.gateway_response || 'Payment was not successful',
                    updatedAt: FieldValue.serverTimestamp()
                }, { merge: true });
            }

            return res.status(400).json({
                error: 'Payment was not successful',
                status: data.status,
                message: data.gateway_response || 'Your bank or network did not complete the payment.'
            });
        }

        // 3. Recalculate total from Firestore prices (server-side validation)
        const { serverTotal: rawTotal, netDeliveryFee, comboDoc, pricedItems } = await calculateServerOrderTotal(db, orderData);
        const discountUserId = orderData?.userId || orderData?.iConId || null;
        let firstOrderEval = {
            applied: false,
            amount: 0,
            percentOff: 0,
            maxOrders: 0,
            slotNumber: 0,
            remaining: 0,
            message: '',
        };
        try {
            firstOrderEval = await claimFirstOrderDiscount(db, {
                userId: discountUserId,
                orderId: orderData?.orderId || reference,
                netDeliveryFee,
                isFood: !isMartOrder && !isFashionOrder,
                studentName: orderData?.fullName || orderData?.studentName || '',
                email: orderData?.email || '',
                paymentReference: reference,
            });
        } catch (discountErr) {
            console.warn('[verify-payment] First-order discount claim failed (non-blocking):', discountErr);
        }
        const serverTotal = firstOrderEval.applied ? rawTotal - firstOrderEval.amount : rawTotal;

        // 4. Verify amount — allow 5% tolerance for rounding
        const paidAmount = data.amount / 100; // Paystack sends in kobo
        const tolerance = serverTotal * 0.05;
        if (Math.abs(paidAmount - serverTotal) > tolerance && serverTotal > 0) {
            console.warn(`Amount mismatch: paid=${paidAmount}, server=${serverTotal}, ref=${reference}`);
            // Log but don't block — use Paystack's verified amount as the source of truth
        }

        // 5. Create/overwrite order in Firestore (server-side)
        //    ALWAYS write the full order — this overwrites any webhook skeleton
        const orderId = orderData?.orderId || `CD-${Math.floor(10000 + Math.random() * 90000)}`;

        const orderDoc: any = {
            orderId,
            userId: orderData?.userId || orderData?.iConId || null,
            fullName: orderData?.fullName || orderData?.studentName || '',
            studentName: orderData?.fullName || orderData?.studentName || '',
            phone: orderData?.phone || '',
            hostel: orderData?.hostel || '',
            hostelName: orderData?.hostelName || '',
            instructions: orderData?.instructions || '',
            total: paidAmount, // Use Paystack-verified amount
            cafeteria: orderData?.cafeteria || '',
            cafeteriaId: orderData?.cafeteriaId || '',
            sectionId: orderData?.sectionId || 'none',
            deliveryMode: orderData?.deliveryMode || 'solo',
            deliveryType: orderData?.deliveryType || 'INSTANT',
            paymentReference: reference,
            paymentMethod: 'PAYSTACK',
            assignedRiderId: null,
            batchId: null,
            status: 'PAID',
            source: 'verified', // Mark as fully verified — webhook won't overwrite this
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        if (orderDoc.deliveryType === 'BATCH') {
            orderDoc.foodBatchId = orderData?.selectedBatchId || orderData?.foodBatchId || null;
            orderDoc.foodBatchName = orderData?.foodBatchName || 'Scheduled Batch';
            orderDoc.orderWindowStart = orderData?.orderWindowStart || null;
            orderDoc.orderWindowEnd = orderData?.orderWindowEnd || null;
            orderDoc.deliveryWindowStart = orderData?.deliveryWindowStart || null;
            orderDoc.deliveryWindowEnd = orderData?.deliveryWindowEnd || null;
        }

        if (isMartOrder) {
            orderDoc.type = 'mart';
            orderDoc.orderType = 'MART';
            orderDoc.items = orderData.items || [];
            orderDoc.totalAmount = paidAmount;
            orderDoc.subtotal = orderData?.subtotal || (paidAmount - (orderData?.deliveryFee || 1500));
            orderDoc.deliveryFee = orderData?.deliveryFee || 1500;
            delete orderDoc.total;
            delete orderDoc.cafeteria;
            delete orderDoc.cafeteriaId;
            delete orderDoc.sectionId;
            delete orderDoc.deliveryMode;
        } else if (isFashionOrder) {
            orderDoc.type = 'fashion';
            orderDoc.orderType = 'FASHION';
            orderDoc.items = pricedItems || orderData.items || [];
            orderDoc.totalAmount = paidAmount;
            orderDoc.subtotal = orderData?.subtotal || (paidAmount - (orderData?.deliveryFee || 1500));
            orderDoc.deliveryFee = orderData?.deliveryFee || 1500;
            orderDoc.fashionBatchName = orderData?.fashionBatchName || null;
            orderDoc.expectedArrivalDate = orderData?.expectedArrivalDate || null;
            orderDoc.fashionBatchStatus = orderData?.fashionBatchStatus || null;
            delete orderDoc.total;
            delete orderDoc.cafeteria;
            delete orderDoc.cafeteriaId;
            delete orderDoc.sectionId;
            delete orderDoc.deliveryMode;
        } else if (isCombo) {
            orderDoc.type = 'combo';
            orderDoc.orderType = 'FOOD';
            orderDoc.comboId = orderData.comboId;
            orderDoc.comboName = orderData.comboName;
            orderDoc.comboItems = orderData.comboItems || []; // Structured items array
            orderDoc.quantity = orderData.quantity || 1;
            orderDoc.plateCount = orderData.quantity || 1; // For generic calculation
            orderDoc.basePrice = orderData.basePrice || 0; // Persist for dashboard pricing
        } else {
            orderDoc.type = 'plate';
            orderDoc.orderType = 'FOOD';

            // Strip out massive base64 images from the arrays to save Firestore size (prevent 1MB limit crash)
            const cleanPlates = (orderData?.plates || []).map((plate: any) => ({
                ...plate,
                items: (plate.items || []).map((i: any) => {
                    const cleanI = { ...i };
                    delete cleanI.image;
                    if (cleanI.item) {
                        cleanI.item = { ...cleanI.item };
                        delete cleanI.item.image;
                    }
                    return cleanI;
                })
            }));

            const cleanSnacks = (orderData?.drinksSnacks || []).map((snack: any) => {
                const cleanS = { ...snack };
                delete cleanS.image;
                return cleanS;
            });

            orderDoc.plates = cleanPlates;
            orderDoc.drinksSnacks = cleanSnacks;
            orderDoc.plateCount = orderData?.plateCount || 1;
        }

        Object.assign(orderDoc, mergeDiscountOntoOrder(orderDoc, firstOrderEval));

        // For pre-saved orders, just update the status — item data is already in Firestore
        const existingSource = existingDoc.exists ? existingDoc.data()?.source : null;
        const isPreSaved = existingDoc.exists && ['pre_saved', 'webhook_confirmed'].includes(existingSource);

        if (isPreSaved) {
            // Pre-saved docs written before the fashion/mart branches existed are
            // plate-shaped (no type/orderType/deliveryFee/items). Back-fill the
            // vertical fields from the verified payload so cold reads classify
            // the order correctly — not just this time, but permanently.
            const preSavedData = existingDoc.data()!;
            const existingVertical = resolveOrderVertical(preSavedData);
            const needsVerticalBackfill = existingVertical !== vertical || !preSavedData.orderType;
            const backfill: any = {};
            if (needsVerticalBackfill) {
                backfill.type = orderDoc.type;
                backfill.orderType = orderDoc.orderType;
                if (isFashionOrder) {
                    backfill.items = orderDoc.items;
                    backfill.totalAmount = orderDoc.totalAmount;
                    backfill.subtotal = orderDoc.subtotal;
                    backfill.deliveryFee = orderDoc.deliveryFee;
                    backfill.fashionBatchName = orderDoc.fashionBatchName;
                    backfill.expectedArrivalDate = orderDoc.expectedArrivalDate;
                    backfill.fashionBatchStatus = orderDoc.fashionBatchStatus;
                    backfill.cafeteria = FieldValue.delete();
                    backfill.plates = FieldValue.delete();
                    backfill.drinksSnacks = FieldValue.delete();
                    backfill.plateCount = FieldValue.delete();
                    backfill.deliveryMode = FieldValue.delete();
                    backfill.serviceProcessingFee = FieldValue.delete();
                } else if (isMartOrder) {
                    backfill.items = orderDoc.items;
                    backfill.totalAmount = orderDoc.totalAmount;
                    backfill.subtotal = orderDoc.subtotal;
                    backfill.deliveryFee = orderDoc.deliveryFee;
                    backfill.plates = FieldValue.delete();
                    backfill.drinksSnacks = FieldValue.delete();
                    backfill.plateCount = FieldValue.delete();
                    backfill.deliveryMode = FieldValue.delete();
                    backfill.serviceProcessingFee = FieldValue.delete();
                }
            }
            await orderRef.set({
                status: 'PAID',
                source: 'verified',
                total: paidAmount, // Use Paystack-verified amount
                paymentStatus: data.status,
                paymentMessage: data.gateway_response || 'Payment confirmed',
                paymentMethod: 'PAYSTACK',
                paidAt: data.paid_at || null,
                ...backfill,
                ...(firstOrderEval.applied ? mergeDiscountOntoOrder({ breakdown: preSavedData.breakdown }, firstOrderEval) : {}),
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
            console.log(`[verify-payment] Updated pre-saved order to PAID: ${reference}${needsVerticalBackfill ? ` [backfilled vertical=${orderDoc.orderType}]` : ''}`);

            // Confirm the reserved slot exactly once across webhook and browser verification.
            if (preSavedData.foodBatchDayId) {
                try {
                    await confirmFoodBatchReservation({
                        db,
                        orderRef,
                        reference,
                        paidAmount,
                    });
                    console.log(`[verify-payment] Confirmed batch slot for ${preSavedData.foodBatchDayId}`);
                } catch (batchErr) {
                    console.warn('[verify-payment] Failed to confirm batch slot (non-blocking):', batchErr);
                }
            }
        } else {
            await orderRef.set(orderDoc);
        }

        // 6. Create admin notification (for fresh orders or pre-saved orders becoming PAID)
        if (!existingDoc.exists || isPreSaved) {
            try {
                const notifyName = isPreSaved ? existingDoc.data()?.fullName : orderDoc.fullName;
                const notifyHostel = isPreSaved ? existingDoc.data()?.hostelName : orderDoc.hostelName;
                const notifyIsMart = isPreSaved ? existingDoc.data()?.type === 'mart' : isMartOrder;
                const notifyIsFashion = isPreSaved ? existingDoc.data()?.type === 'fashion' : isFashionOrder;
                await db.collection('notifications').add({
                    userId: 'admin',
                    title: notifyIsFashion ? 'New Fashion Order Received' : (notifyIsMart ? 'New Mart Order Received' : 'New Order Received'),
                    message: `${notifyName || 'A student'} just ordered from ${notifyHostel || 'campus'}`,
                    type: 'order',
                    link: notifyIsFashion ? '/admin/fashion/orders' : (notifyIsMart ? '/admin/mart/orders' : '/admin/orders'),
                    isRead: false,
                    createdAt: FieldValue.serverTimestamp()
                });
            } catch (notifErr) {
                console.error('Failed to create admin notification:', notifErr);
            }
        }

        // 7. Trigger Admin Push Notification (only for fresh orders)
        if (!existingDoc.exists) {
            try {
                const adminsSnap = await db.collection('users').where('role', '==', 'ADMIN').get();
                let allAdminTokens: string[] = [];
                adminsSnap.docs.forEach(doc => {
                    const d = doc.data();
                    if (d.fcmTokens && Array.isArray(d.fcmTokens)) {
                        allAdminTokens = [...allAdminTokens, ...d.fcmTokens];
                    }
                });

                if (allAdminTokens.length > 0 && process.env.INTERNAL_API_KEY) {
                    const protocol = req.headers['x-forwarded-proto'] || 'https';
                    const host = req.headers.host || 'calebdeck.com';
                    const apiUrl = `${protocol}://${host}/api/send-push`;
                    const adminMsg = `${orderDoc.fullName || 'A student'} just ordered from ${orderDoc.hostelName || orderDoc.hostel}`;
                    const pushLink = isFashionOrder ? '/admin/fashion/orders' : (isMartOrder ? '/admin/mart/orders' : '/admin/orders');

                    await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Api-Key': process.env.INTERNAL_API_KEY
                        },
                        body: JSON.stringify({
                            title: isFashionOrder ? 'New Fashion Order' : (isMartOrder ? 'New Mart Order' : 'New Order'),
                            body: adminMsg,
                            tokens: allAdminTokens,
                            link: pushLink
                        })
                    }).catch(err => console.error('[verify-payment] Push error:', err));
                }
            } catch (pushErr) {
                console.error('[verify-payment] Push notification error:', pushErr);
            }
        }

        return res.status(200).json({
            data: {
                success: true,
                message: 'Payment verified and order created',
                paystackRef: data.reference,
                amount: paidAmount,
                paidAt: data.paid_at,
                firestoreOrderId: reference,
                orderId
            }
        });
    } catch (error: any) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ error: 'Payment verification failed', details: error.response?.data || error.message });
    }
}
