import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Paystack only sends POST
    if (req.method !== 'POST') return res.status(405).end();

    try {
        if (!db) {
            console.error('[Webhook] Firebase not initialized');
            return res.status(500).end();
        }

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
                        updatedAt: FieldValue.serverTimestamp()
                    });
                    console.log(`[Webhook] Marked pre-saved order as FAILED: ${reference}`);
                }
                return res.status(200).json({ received: true, failed: true });
            }

            // Pre-saved order (items already complete) — just flip status to PAID
            if (existingData.source === 'pre_saved' && existingData.status === 'PENDING_PAYMENT') {
                await orderRef.update({
                    status: 'PAID',
                    source: 'webhook_confirmed',
                    updatedAt: FieldValue.serverTimestamp()
                });
                console.log(`[Webhook] Confirmed pre-saved order: ${reference}`);

                // Send admin notification since this is the payment confirmation
                try {
                    const adminMsg = `${existingData.fullName} just ordered from ${existingData.hostelName || existingData.hostel}`;
                    await db.collection('notifications').add({
                        userId: 'admin',
                        title: 'New Order',
                        message: adminMsg,
                        type: 'order',
                        link: '/admin/orders',
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
                            body: JSON.stringify({ title: 'New Order', body: adminMsg, tokens: allAdminTokens, link: '/admin/orders' })
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
        const metadata = paymentData.metadata || {};
        const paidAmount = paymentData.amount / 100;

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
            await db.collection('notifications').add({
                userId: 'admin',
                title: 'New Order',
                message: adminMsg,
                type: 'order',
                link: '/admin/orders',
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
                        title: 'New Order',
                        body: adminMsg,
                        tokens: allAdminTokens,
                        link: '/admin/orders'
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
