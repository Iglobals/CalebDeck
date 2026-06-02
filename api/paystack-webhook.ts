import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { adminDb } from '../server/firebase-admin.js';
import { creditWallet, ensureWalletUser, WALLET_FUNDING_MAX, WALLET_FUNDING_MIN } from '../server/wallet.js';

function metadataValue(metadata: any, key: string) {
    if (metadata?.[key] !== undefined && metadata?.[key] !== null) return metadata[key];
    const field = Array.isArray(metadata?.custom_fields)
        ? metadata.custom_fields.find((item: any) => item?.variable_name === key || item?.display_name === key)
        : null;
    return field?.value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Paystack only sends POST
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const db = adminDb();

        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!secretKey) {
            console.error('[Webhook] PAYSTACK_SECRET_KEY missing');
            return res.status(500).end();
        }

        // 1. Verify Paystack signature
        const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const hash = crypto
            .createHmac('sha512', secretKey)
            .update(rawBody)
            .digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            console.warn('[Webhook] Invalid signature');
            return res.status(401).end();
        }

        const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        // 2. Only process successful and failed charges
        if (event.event !== 'charge.success' && event.event !== 'charge.failed') {
            return res.status(200).json({ received: true });
        }

        const paymentData = event.data;
        const reference = paymentData.reference;
        const metadata = paymentData.metadata || {};
        const paidAmount = paymentData.amount / 100;

        const walletPurpose = String(metadataValue(metadata, 'purpose') || '').toUpperCase();
        const walletSource = String(metadataValue(metadata, 'source') || '').toLowerCase();
        const isWalletFunding = walletSource === 'calebnet_wallet' || walletPurpose === 'CALEBNET_WALLET_FUNDING';

        if (isWalletFunding) {
            if (event.event === 'charge.failed') {
                console.log(`[Webhook] CalebNet wallet funding failed: ${reference}`);
                return res.status(200).json({ received: true, failed: true, walletFunding: true });
            }

            const userId = String(metadataValue(metadata, 'userId') || '').trim();
            if (!userId) {
                console.warn(`[Webhook] Wallet funding missing userId: ${reference}`);
                return res.status(200).json({ received: true, error: true, walletFunding: true, reason: 'missing_user_id' });
            }

            if (!Number.isFinite(paidAmount) || paidAmount < WALLET_FUNDING_MIN || paidAmount > WALLET_FUNDING_MAX) {
                console.warn(`[Webhook] Wallet funding amount outside allowed range: ${reference} (${paidAmount})`);
                return res.status(200).json({ received: true, error: true, walletFunding: true, reason: 'invalid_amount' });
            }

            await ensureWalletUser(userId, {
                email: metadataValue(metadata, 'email') || paymentData.customer?.email || null,
                displayName: metadataValue(metadata, 'displayName') || null,
                phoneNumber: metadataValue(metadata, 'phoneNumber') || null,
            });

            const result = await creditWallet({
                userId,
                amount: paidAmount,
                reference,
                purpose: 'WALLET_FUNDING',
                relatedOrderId: null,
                metadataSafe: {
                    source: 'paystack_webhook',
                    paystackStatus: paymentData.status,
                    channel: paymentData.channel || null,
                    paidAt: paymentData.paid_at || paymentData.paidAt || null,
                    customerEmail: paymentData.customer?.email || null,
                },
            });

            console.log(`[Webhook] CalebNet wallet funding credited: ${reference} alreadyProcessed=${result.alreadyProcessed}`);
            return res.status(200).json({ received: true, walletFunding: true, credited: true, alreadyProcessed: result.alreadyProcessed });
        }

        // 3. Idempotent — check if order already exists
        const isMartOrder = paymentData.metadata?.orderType === 'mart';
        const orderRef = db.collection('orders').doc(reference);
        const existingDoc = await orderRef.get();

        if (existingDoc.exists) {
            const existingData = existingDoc.data()!;

            // Handle failed charges
            if (event.event === 'charge.failed') {
                if (existingData.status === 'PENDING_PAYMENT') {
                    await orderRef.update({
                        status: 'FAILED',
                        paymentStatus: paymentData.status || 'failed',
                        paymentMessage: paymentData.gateway_response || 'Payment failed',
                        updatedAt: FieldValue.serverTimestamp()
                    });
                    console.log(`[Webhook] Marked pre-saved order as FAILED: ${reference}`);

                    // Free batch slot reservation if applicable
                    if (existingData.foodBatchDayId) {
                        try {
                            const batchDayRef = db.collection('food_batch_days').doc(existingData.foodBatchDayId);
                            await batchDayRef.update({
                                reservedSlots: FieldValue.increment(-1),
                            });
                            console.log(`[Webhook] Freed batch slot for failed payment: ${existingData.foodBatchDayId}`);
                        } catch (batchErr) {
                            console.warn('[Webhook] Failed to free batch slot (non-blocking):', batchErr);
                        }
                    }
                }
                return res.status(200).json({ received: true, failed: true });
            }

            // Pre-saved order (items already complete) — just flip status to PAID
            if (existingData.source === 'pre_saved' && ['PENDING_PAYMENT', 'FAILED'].includes(existingData.status)) {
                await orderRef.update({
                    status: 'PAID',
                    source: 'webhook_confirmed',
                    paymentStatus: paymentData.status || 'success',
                    paymentMessage: paymentData.gateway_response || 'Payment confirmed',
                    paidAt: paymentData.paid_at || null,
                    updatedAt: FieldValue.serverTimestamp()
                });
                console.log(`[Webhook] Confirmed pre-saved order: ${reference}`);

                // Send admin notification since this is the payment confirmation
                try {
                    const adminMsg = `${existingData.fullName} just ordered from ${existingData.hostelName || existingData.hostel}`;
                    const notifyIsMart = existingData.type === 'mart' || isMartOrder;
                    const notifyLink = notifyIsMart ? '/admin/mart/orders' : '/admin/orders';
                    await db.collection('notifications').add({
                        userId: 'admin',
                        title: notifyIsMart ? 'New Mart Order' : 'New Order',
                        message: adminMsg,
                        type: 'order',
                        link: notifyLink,
                        isRead: false,
                        createdAt: FieldValue.serverTimestamp()
                    });

                    // Push notification to admin
                    const adminsSnap = await db.collection('users').where('role', '==', 'ADMIN').get();
                    let allAdminTokens: string[] = [];
                    adminsSnap.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                            allAdminTokens = [...allAdminTokens, ...data.fcmTokens];
                        }
                    });
                    if (allAdminTokens.length > 0 && process.env.INTERNAL_API_KEY) {
                        const protocol = req.headers['x-forwarded-proto'] || 'https';
                        const host = req.headers.host || 'calebdeck.com';
                        const apiUrl = `${protocol}://${host}/api/send-push`;
                        await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-Api-Key': process.env.INTERNAL_API_KEY },
                            body: JSON.stringify({ title: notifyIsMart ? 'New Mart Order' : 'New Order', body: adminMsg, tokens: allAdminTokens, link: notifyLink })
                        }).catch(err => console.error('[Webhook] Push error:', err));
                    }
                } catch (err) {
                    console.error('[Webhook] Notification error on pre-saved confirm:', err);
                }

                return res.status(200).json({ received: true, confirmed: true });
            }

            // Already fully created by verify-payment — don't touch
            if (existingData.source !== 'webhook') {
                console.log(`[Webhook] Complete order already exists for ref: ${reference}`);
                return res.status(200).json({ received: true, duplicate: true });
            }

            // Our own webhook skeleton — already exists
            console.log(`[Webhook] Webhook skeleton already exists for ref: ${reference}`);
            return res.status(200).json({ received: true, duplicate: true });
        }

        // 4. Try to extract order data from Paystack metadata
        // 4b. GUARD: Only process CalebDeck transactions
        // If this transaction has no CalebDeck-specific metadata, it belongs to another product
        // sharing the same Paystack account (e.g. IES). Silently ignore it.
        const isCalebDeck = metadata.orderId?.startsWith('CD-') ||
            metadata.cafeteriaId ||
            metadata.hostel ||
            metadata.orderType === 'mart' ||
            metadata.source === 'calebdeck';

        if (!isCalebDeck) {
            console.log(`[Webhook] Ignoring non-CalebDeck transaction: ${reference} (amount: ${paidAmount})`);
            return res.status(200).json({ received: true, ignored: true, reason: 'not_calebdeck' });
        }

        // 4c. GUARD: If the charge failed and it's a new order (not pre-saved), ignore it entirely.
        if (event.event === 'charge.failed') {
            console.log(`[Webhook] Ignoring failed new order: ${reference}`);
            return res.status(200).json({ received: true, ignored: true, reason: 'failed_transaction' });
        }

        const orderDoc: any = {
            orderId: metadata.orderId || `CD-WH-${Math.floor(10000 + Math.random() * 90000)}`,
            fullName: metadata.fullName || metadata.studentName || 'Unknown (Webhook)',
            studentName: metadata.fullName || metadata.studentName || '',
            phone: metadata.phone || '',
            hostel: metadata.hostel || '',
            hostelName: metadata.hostelName || '',
            instructions: metadata.instructions || '',
            total: paidAmount,
            cafeteria: metadata.cafeteria || '',
            cafeteriaId: metadata.cafeteriaId || '',
            sectionId: metadata.sectionId || 'none',
            deliveryMode: metadata.deliveryMode || 'solo',
            paymentReference: reference,
            assignedRiderId: null,
            batchId: null,
            status: 'PAID',
            source: 'webhook', // Mark as webhook-created for debugging
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        if (isMartOrder) {
            orderDoc.type = 'mart';
            orderDoc.items = metadata.items || [];
            orderDoc.totalAmount = paidAmount;
            orderDoc.subtotal = metadata.subtotal || (paidAmount - 1050); // Fallback: minus 750 delivery and 300 fees
            orderDoc.deliveryFee = metadata.deliveryFee || 750;
            orderDoc.serviceProcessingFee = 300;
            delete orderDoc.total;
            delete orderDoc.cafeteria;
            delete orderDoc.cafeteriaId;
            delete orderDoc.sectionId;
            delete orderDoc.deliveryMode;
        } else if (metadata.type === 'combo') {
            orderDoc.type = 'combo';
            orderDoc.comboId = metadata.comboId;
            orderDoc.comboName = metadata.comboName;
            orderDoc.comboItems = metadata.comboItems || [];
            orderDoc.quantity = metadata.quantity || 1;
            orderDoc.plateCount = metadata.quantity || 1;
            orderDoc.basePrice = metadata.basePrice || 0;
        } else {
            orderDoc.plates = metadata.plates || [];
            orderDoc.drinksSnacks = metadata.drinksSnacks || [];
            orderDoc.plateCount = metadata.plateCount || 1;
        }

        await orderRef.set(orderDoc);
        console.log(`[Webhook] Created order ${reference} from ref: ${reference}`);

        // 5. Admin notification
        try {
            const adminMsg = `${orderDoc.fullName} just ordered from ${orderDoc.hostelName || orderDoc.hostel}`;
            const notifyLink = isMartOrder ? '/admin/mart/orders' : '/admin/orders';
            await db.collection('notifications').add({
                userId: 'admin',
                title: isMartOrder ? 'New Mart Order' : 'New Order',
                message: adminMsg,
                type: 'order',
                link: notifyLink,
                isRead: false,
                createdAt: FieldValue.serverTimestamp()
            });

            // 6. Trigger Admin Push Notification
            const adminsSnap = await db.collection('users').where('role', '==', 'ADMIN').get();
            let allAdminTokens: string[] = [];
            
            adminsSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                    allAdminTokens = [...allAdminTokens, ...data.fcmTokens];
                }
            });
            
            if (allAdminTokens.length > 0 && process.env.INTERNAL_API_KEY) {
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const host = req.headers.host || 'calebdeck.com'; 
                const apiUrl = `${protocol}://${host}/api/send-push`;
                
                await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Api-Key': process.env.INTERNAL_API_KEY
                    },
                    body: JSON.stringify({
                        title: isMartOrder ? 'New Mart Order' : 'New Order',
                        body: adminMsg,
                        tokens: allAdminTokens,
                        link: notifyLink
                    })
                }).catch(err => console.error('[Webhook] API Push error:', err));
            }
        } catch (err) {
            console.error('[Webhook] Notification error:', err);
        }

        return res.status(200).json({ received: true, created: true, orderId: reference });
    } catch (error: any) {
        console.error('[Webhook] Error:', error);
        // Return 200 to prevent Paystack retries on our errors
        return res.status(200).json({ received: true, error: true });
    }
}
