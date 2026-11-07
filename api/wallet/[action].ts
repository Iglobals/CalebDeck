import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import axios from 'axios';
import { adminDb, ensureFirebaseAdmin } from '../../server/firebase-admin.js';
import { calculateServerOrderTotal, validateAndResolveOrderHostel } from '../../server/order-utils.js';
import { evaluateFirstOrderDiscountTx, writeFirstOrderDiscountClaim, mergeDiscountOntoOrder } from '../../server/first-order-discount.js';
import { setCors } from '../../server/calebnet.js';
import { verifyUser } from '../../server/verify-user.js';
import { creditWallet, ensureWalletUser, WALLET_FUNDING_MAX, WALLET_FUNDING_MIN, recordFundingIntent, resolveFundingAmount, markFundingIntentUsed } from '../../server/wallet.js';
import { resolveOrderVertical } from '../../src/services/orderVertical.js';
import { confirmFoodBatchReservation } from '../../server/food-batch.js';
import { isRateLimited, clientIp } from '../../server/rate-limit.js';
import { recordEvent, monitoringFromError } from '../../server/monitoring.js';
import { GroupOrderError, resolveFoodGroupPricing } from '../../src/services/groupPricing.js';
import { formatCafeteriaSectionLabel } from '../../src/services/cafeterias.js';
import { createTrackingToken } from '../../server/order-tracking.js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

async function verifyPaystack(reference: string) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error('Paystack verification is not configured');

    const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secretKey}` }, timeout: 15000 }
    );
    return response.data?.data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (isRateLimited(`wallet:${clientIp(req)}`, 30, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const { action } = req.query;

    if (action === 'funding-intent') {
        try {
            const user = await verifyUser(req);
            if (!user) return res.status(401).json({ error: 'Sign in to fund your CalebNet wallet.' });

            const reference = String(req.body?.reference || '').trim();
            const amount = Number(req.body?.amount);
            if (!reference) return res.status(400).json({ error: 'Payment reference is required' });
            if (!Number.isFinite(amount) || amount < WALLET_FUNDING_MIN || amount > WALLET_FUNDING_MAX) {
                return res.status(400).json({ error: `Wallet funding must be between ₦${WALLET_FUNDING_MIN.toLocaleString()} and ₦${WALLET_FUNDING_MAX.toLocaleString()}` });
            }

            await recordFundingIntent(user.uid, reference, amount);
            return res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('[Wallet Funding Intent]', error);
            return res.status(500).json({ error: 'Could not record funding intent' });
        }
    }

    if (action === 'verify-funding') {
        try {
            const user = await verifyUser(req);
            if (!user) return res.status(401).json({ error: 'Sign in to fund your CalebNet wallet.' });

            const reference = String(req.body?.reference || '').trim();
            if (!reference) return res.status(400).json({ error: 'Payment reference is required' });

            await ensureWalletUser(user.uid, {
                email: user.email,
                displayName: user.name,
                phoneNumber: user.phoneNumber,
            });

            const payment = await verifyPaystack(reference);
            // Log the essentials of what Paystack actually returned before deciding —
            // the client toast branches on these, so the decision must be traceable.
            console.info('[Wallet Verify Funding]', {
                reference,
                paystackStatus: payment?.status ?? null,
                amountKobo: payment?.amount ?? null,
                channel: payment?.channel ?? null,
                customerEmail: payment?.customer?.email ?? null,
                signedInEmail: user.email ?? null,
            });
            if (payment?.status !== 'success') {
                // A genuinely failed charge will never succeed — 400 (definitive).
                // pending/abandoned/timeout may still settle — 202 so the client
                // keeps polling instead of showing an error for money that lands later.
                if (payment?.status === 'failed') {
                    return res.status(400).json({ error: 'Payment was not successful', paystackStatus: 'failed' });
                }
                return res.status(202).json({
                    error: 'Payment has not been confirmed by Paystack yet',
                    paystackStatus: payment?.status || 'unknown',
                });
            }

            const amount = Number(payment.amount || 0) / 100;
            if (!Number.isFinite(amount) || amount < WALLET_FUNDING_MIN || amount > WALLET_FUNDING_MAX) {
                return res.status(400).json({ error: `Wallet funding must be between ₦${WALLET_FUNDING_MIN.toLocaleString()} and ₦${WALLET_FUNDING_MAX.toLocaleString()}` });
            }

            const customerEmail = payment.customer?.email;
            if (customerEmail && user.email && String(customerEmail).toLowerCase() !== String(user.email).toLowerCase()) {
                return res.status(403).json({ error: 'This payment does not belong to the signed-in wallet.' });
            }

            // Credit what the user ASKED to fund (server-recorded intent), not what
            // Paystack reports as charged — surcharges never leak into the wallet.
            const intent = await resolveFundingAmount(user.uid, reference, amount);
            const creditAmount = intent ? intent.amount : amount;
            if (intent) {
                console.info(`[Wallet Verify Funding] ${reference} crediting intent amount ₦${creditAmount} (charged ₦${amount})`);
            }

            const result = await creditWallet({
                userId: user.uid,
                amount: creditAmount,
                reference,
                purpose: 'WALLET_FUNDING',
                relatedOrderId: null,
                metadataSafe: {
                    paystackStatus: payment.status,
                    channel: payment.channel || null,
                    paidAt: payment.paid_at || payment.paidAt || null,
                    customerEmail: customerEmail || null,
                    chargedAmount: amount,
                    creditedFromIntent: !!intent,
                },
            });

            if (intent) {
                await markFundingIntentUsed(reference).catch(err =>
                    console.warn(`[Wallet Verify Funding] Failed to mark intent used: ${reference}`, err));
            }

            return res.status(200).json({
                success: true,
                alreadyProcessed: result.alreadyProcessed,
                balance: result.balance,
                transaction: result.transaction,
            });
        } catch (error: any) {
            console.error('[Wallet Verify Funding]', error);
            return res.status(500).json({ error: error.message || 'Wallet funding verification failed' });
        }
    }

    if (action === 'pay-order') {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const idToken = authHeader.split('Bearer ')[1];
            ensureFirebaseAdmin();
            const decodedToken = await getAuth().verifyIdToken(idToken);
            const uid = decodedToken.uid;

            const db = adminDb();
            const { orderData, reference } = req.body;

            if (!orderData) {
                return res.status(400).json({ error: 'orderData is required' });
            }

            const hostelValidation = await validateAndResolveOrderHostel(db, orderData, {
                enforceActiveAndAck: true,
            });
            if (!hostelValidation.valid) {
                await recordEvent({
                    severity: 'medium',
                    category: 'order',
                    service: 'checkout',
                    eventType: hostelValidation.code === 'HOSTEL_REQUIRED' ? 'missing_hostel' : 'invalid_checkout_payload',
                    humanTitle: 'Wallet checkout was blocked by hostel validation',
                    humanSummary: hostelValidation.message || 'A wallet payment could not continue because hostel details were incomplete.',
                    errorCode: hostelValidation.code || 'HOSTEL_VALIDATION_FAILED',
                    endpoint: '/api/wallet/pay-order',
                    orderId: orderData?.orderId,
                    paymentReference: reference,
                });
                return res.status(400).json({
                    error: hostelValidation.message || 'Please complete the hostel requirement before proceeding.',
                    code: hostelValidation.code || 'HOSTEL_VALIDATION_FAILED',
                });
            }

            const displayOrderId = orderData?.orderId || `CD-${Math.floor(10000 + Math.random() * 90000)}`;
            // Prefer the pre-save reference so batch reservations (keyed by that
            // doc id) get confirmed on the same order Paystack would have used.
            const orderId = (typeof reference === 'string' && reference.trim())
                ? reference.trim()
                : displayOrderId;
            const vertical = resolveOrderVertical(orderData);
            const isMartOrder = vertical === 'MART';
            const isFashionOrder = vertical === 'FASHION';
            const isCombo = orderData?.type === 'combo';

            let finalAmount = 0;
            let isPreSaved = false;
            let alreadyPaid = false;
            let resolvedTrackingToken = '';

            await db.runTransaction(async (t) => {
                const userRef = db.collection('users').doc(uid);
                const userDoc = await t.get(userRef);
                if (!userDoc.exists) {
                    throw new Error('User profile not found');
                }

                // Firestore transactions require ALL reads before ANY writes.
                const orderRef = db.collection('orders').doc(orderId);
                const existingOrder = await t.get(orderRef);
                const existingData = existingOrder.exists ? existingOrder.data() : null;

                // Idempotency guard: if this order was already paid/verified, do not debit the wallet again.
                if (
                    existingData &&
                    (existingData.source === 'verified' ||
                        (existingData.status && !['PENDING_PAYMENT', 'FAILED'].includes(existingData.status)))
                ) {
                    alreadyPaid = true;
                    finalAmount = Number(existingData.total ?? existingData.totalAmount ?? 0);
                    resolvedTrackingToken = existingData.trackingToken || '';
                    return;
                }

                isPreSaved = Boolean(existingData && existingData.source === 'pre_saved');

                const userData = userDoc.data()!;
                const walletBalance = Number(userData.walletBalance || 0);

                const { serverTotal: rawTotal, netDeliveryFee, breakdown: serverBreakdown, pricedItems } = await calculateServerOrderTotal(db, orderData, t);
                const firstOrderEval = await evaluateFirstOrderDiscountTx(t, db, {
                    userId: uid,
                    userData,
                    netDeliveryFee,
                    isFood: !isMartOrder && !isFashionOrder,
                });
                const serverTotal = firstOrderEval.applied ? rawTotal - firstOrderEval.amount : rawTotal;
                finalAmount = serverTotal;

                if (walletBalance < serverTotal) {
                    throw new Error('Insufficient wallet balance');
                }

                t.update(userRef, {
                    walletBalance: FieldValue.increment(-serverTotal),
                    updatedAt: FieldValue.serverTimestamp(),
                    ...(firstOrderEval.applied
                        ? { firstOrderDiscountClaimed: true, firstOrderDiscountClaimedAt: FieldValue.serverTimestamp() }
                        : {})
                });

                if (firstOrderEval.applied) {
                    writeFirstOrderDiscountClaim(t, db, {
                        userId: uid,
                        orderId: displayOrderId,
                        evaluation: firstOrderEval,
                        studentName: orderData?.fullName || orderData?.studentName || userData?.fullName || '',
                        email: userData?.email || '',
                        paymentReference: `WALLET-${displayOrderId}`,
                        skipUserWrite: true,
                    });
                }

                const transactionRef = db.collection('wallet_transactions').doc();
                t.set(transactionRef, {
                    userId: uid,
                    type: 'debit',
                    amount: serverTotal,
                    balanceBefore: walletBalance,
                    balanceAfter: walletBalance - serverTotal,
                    purpose: isFashionOrder ? 'FASHION_PURCHASE' : isMartOrder ? 'MART_PURCHASE' : 'FOOD_PURCHASE',
                    status: 'successful',
                    reference: orderId,
                    relatedOrderId: displayOrderId,
                    createdAt: FieldValue.serverTimestamp()
                });

                const resolvedCafeteriaId = orderData?.cafeteriaId || existingData?.cafeteriaId || '';
                const resolvedSectionId = orderData?.sectionId || existingData?.sectionId || 'none';
                const resolvedCafeLabel = (!isMartOrder && !isFashionOrder)
                    ? formatCafeteriaSectionLabel(
                        resolvedCafeteriaId,
                        resolvedSectionId,
                        orderData?.cafeteriaDisplay || orderData?.cafeteria || existingData?.cafeteriaDisplay || existingData?.cafeteria
                    )
                    : '';

                const orderDocBase: any = {
                    orderId,
                    userId: uid, // authoritative — the paying wallet owner
                    fullName: orderData?.fullName || orderData?.studentName || '',
                    studentName: orderData?.fullName || orderData?.studentName || '',
                    phone: orderData?.phone || '',
                    hostel: orderData?.hostel || '',
                    hostelName: orderData?.hostelName || '',
                    ...hostelValidation.hostelFields,
                    instructions: orderData?.instructions || '',
                    total: serverTotal,
                    cafeteria: resolvedCafeLabel !== 'Not recorded' ? resolvedCafeLabel : (orderData?.cafeteria || existingData?.cafeteria || ''),
                    cafeteriaDisplay: resolvedCafeLabel !== 'Not recorded' ? resolvedCafeLabel : '',
                    cafeteriaId: resolvedCafeteriaId,
                    sectionId: resolvedSectionId,
                    deliveryMode: orderData?.deliveryMode || 'solo',
                    groupSize: 1,
                    deliveryType: orderData?.deliveryType || 'INSTANT',
                    trackingToken: existingData?.trackingToken || createTrackingToken(),
                    paymentReference: `WALLET-${displayOrderId}`,
                    paymentMethod: 'WALLET',
                    assignedRiderId: null,
                    batchId: null,
                    status: 'PAID',
                    source: 'verified',
                    createdAt: existingData?.createdAt || FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                };
                resolvedTrackingToken = orderDocBase.trackingToken;

                if (orderDocBase.deliveryType === 'BATCH') {
                    orderDocBase.foodBatchId = orderData?.selectedBatchId || orderData?.foodBatchId || existingData?.foodBatchId || null;
                    orderDocBase.foodBatchName = orderData?.foodBatchName || existingData?.foodBatchName || 'Scheduled Batch';
                    orderDocBase.orderWindowStart = orderData?.orderWindowStart || existingData?.orderWindowStart || null;
                    orderDocBase.orderWindowEnd = orderData?.orderWindowEnd || existingData?.orderWindowEnd || null;
                    orderDocBase.deliveryWindowStart = orderData?.deliveryWindowStart || existingData?.deliveryWindowStart || null;
                    orderDocBase.deliveryWindowEnd = orderData?.deliveryWindowEnd || existingData?.deliveryWindowEnd || null;
                    orderDocBase.foodBatchDayId = existingData?.foodBatchDayId || orderData?.foodBatchDayId || null;
                }

                if (isMartOrder) {
                    orderDocBase.type = 'mart';
                    orderDocBase.orderType = 'MART';
                    orderDocBase.items = orderData.items || [];
                    orderDocBase.totalAmount = serverTotal;
                    orderDocBase.subtotal = orderData?.subtotal || (serverTotal - (orderData?.deliveryFee || 1500));
                    orderDocBase.deliveryFee = orderData?.deliveryFee || 1500;
                    delete orderDocBase.total;
                    delete orderDocBase.cafeteria;
                    delete orderDocBase.cafeteriaDisplay;
                    delete orderDocBase.cafeteriaId;
                    delete orderDocBase.sectionId;
                    delete orderDocBase.deliveryMode;
                    delete orderDocBase.groupSize;
                } else if (isFashionOrder) {
                    orderDocBase.type = 'fashion';
                    orderDocBase.orderType = 'FASHION';
                    orderDocBase.items = pricedItems || orderData.items || [];
                    orderDocBase.totalAmount = serverTotal;
                    orderDocBase.subtotal = orderData?.subtotal || (serverTotal - (orderData?.deliveryFee || 1500));
                    orderDocBase.deliveryFee = orderData?.deliveryFee || 1500;
                    orderDocBase.fashionBatchName = orderData?.fashionBatchName || null;
                    orderDocBase.expectedArrivalDate = orderData?.expectedArrivalDate || null;
                    orderDocBase.fashionBatchStatus = orderData?.fashionBatchStatus || null;
                    delete orderDocBase.total;
                    delete orderDocBase.cafeteria;
                    delete orderDocBase.cafeteriaDisplay;
                    delete orderDocBase.cafeteriaId;
                    delete orderDocBase.sectionId;
                    delete orderDocBase.deliveryMode;
                    delete orderDocBase.groupSize;
                } else if (isCombo) {
                    const foodGroup = resolveFoodGroupPricing(orderData);
                    orderDocBase.type = 'combo';
                    orderDocBase.orderType = 'FOOD';
                    orderDocBase.comboId = orderData.comboId;
                    orderDocBase.comboName = orderData.comboName;
                    orderDocBase.comboItems = orderData.comboItems || []; 
                    orderDocBase.quantity = foodGroup.plateCount;
                    orderDocBase.plateCount = foodGroup.plateCount; 
                    orderDocBase.basePrice = orderData.basePrice || 0;
                    orderDocBase.deliveryMode = foodGroup.deliveryMode;
                    orderDocBase.groupSize = foodGroup.groupSize;
                } else {
                    const foodGroup = resolveFoodGroupPricing(orderData);
                    orderDocBase.deliveryMode = foodGroup.deliveryMode;
                    orderDocBase.groupSize = foodGroup.groupSize;
                    orderDocBase.plateCount = foodGroup.plateCount;
                    orderDocBase.type = 'plate';
                    orderDocBase.orderType = 'FOOD';

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
        
                    orderDocBase.plates = cleanPlates;
                    orderDocBase.drinksSnacks = cleanSnacks;
                    orderDocBase.plateCount = foodGroup.plateCount;
                }

                if (serverBreakdown && !isMartOrder && !isFashionOrder) {
                    orderDocBase.breakdown = serverBreakdown;
                } else if (orderData?.breakdown) {
                    const restBreakdown = { ...orderData.breakdown };
                    delete restBreakdown.firstOrderDiscount;
                    delete restBreakdown.firstOrderDiscountPercent;
                    orderDocBase.breakdown = restBreakdown;
                }

                t.set(orderRef, mergeDiscountOntoOrder(orderDocBase, firstOrderEval), { merge: true });
            });

            if (alreadyPaid) {
                return res.status(200).json({
                    data: {
                        success: true,
                        message: 'Order already paid',
                        amount: finalAmount,
                        orderId: displayOrderId,
                        firestoreOrderId: orderId,
                        trackingToken: resolvedTrackingToken,
                    }
                });
            }

            try {
                await confirmFoodBatchReservation({
                    db,
                    orderRef: db.collection('orders').doc(orderId),
                    reference: orderId,
                    paidAmount: finalAmount,
                });
            } catch (batchErr) {
                console.warn('[pay-order] Failed to confirm batch slot (non-blocking):', batchErr);
            }
            
            try {
                await db.collection('users').doc(uid).update({
                    productsUsed: FieldValue.arrayUnion('CalebDeck Mart')
                });
            } catch (e) {
                console.warn('[pay-order] Failed to update productsUsed', e);
            }

            try {
                const notifyName = orderData?.fullName || orderData?.studentName;
                const notifyHostel = orderData?.hostelName || orderData?.hostel;
                await db.collection('notifications').add({
                    userId: 'admin',
                    title: isMartOrder ? 'New Mart Order Received' : 'New Order Received',
                    message: `${notifyName || 'A student'} just ordered from ${notifyHostel || 'campus'}`,
                    type: 'order',
                    link: isMartOrder ? '/admin/mart/orders' : '/admin/orders',
                    isRead: false,
                    createdAt: FieldValue.serverTimestamp()
                });
            } catch (notifErr) {
                console.error('Failed to create admin notification:', notifErr);
            }

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
                    const adminMsg = `${orderData?.fullName || 'A student'} just ordered from ${orderData?.hostelName || orderData?.hostel}`;
                    const pushLink = isFashionOrder ? '/admin/fashion/orders' : (isMartOrder ? '/admin/mart/orders' : '/admin/orders');

                    await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Api-Key': process.env.INTERNAL_API_KEY
                        },
                        body: JSON.stringify({
                            title: isMartOrder ? 'New Mart Order Received' : 'New Order Received',
                            body: adminMsg,
                            tokens: allAdminTokens,
                            link: pushLink
                        })
                    }).catch(err => console.error('[pay-order] Push error:', err));
                }
            } catch (pushErr) {
                console.error('[pay-order] Push notification error:', pushErr);
            }

            return res.status(200).json({
                data: {
                    success: true,
                    message: 'Wallet payment successful',
                    amount: finalAmount,
                    orderId: displayOrderId,
                    firestoreOrderId: orderId,
                    trackingToken: resolvedTrackingToken,
                }
            });

        } catch (error: any) {
            if (error instanceof GroupOrderError || error?.code === 'GROUP_SIZE_INVALID') {
                return res.status(400).json({ error: error.message, code: 'GROUP_SIZE_INVALID' });
            }
            console.error('Wallet payment error:', error);
            const parsed = monitoringFromError(error);
            await recordEvent({
                severity: 'high',
                category: 'payment',
                service: 'payment',
                eventType: 'payment_init_failed',
                humanTitle: 'Wallet payment failed',
                humanSummary: 'A customer tried to pay from their wallet, but the charge could not be completed.',
                suggestedAction: 'Check the wallet balance, order payload and System Health logs. Do not retry blindly if the debit may have succeeded.',
                errorMessage: parsed.message,
                errorCode: parsed.errorCode || 'WALLET_PAY_FAILED',
                stack: parsed.stack,
                endpoint: '/api/wallet/pay-order',
            });
            const known = String(error.message || '');
            const safe = /hostel|batch|wallet|balance|insufficient|unauthorized|required/i.test(known)
                ? known
                : 'Wallet payment failed';
            return res.status(400).json({ error: safe });
        }
    }

    return res.status(404).json({ error: 'Action not found' });
}
