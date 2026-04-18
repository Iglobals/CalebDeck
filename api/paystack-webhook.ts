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

        // 2. Only process successful charges
        if (event.event !== 'charge.success') {
            return res.status(200).json({ received: true });
        }

        const paymentData = event.data;
        const reference = paymentData.reference;

        // 3. Idempotent — check if order already exists
        //    If verify-payment already wrote the full order (source='verified'),
        //    don't overwrite it — verify-payment has the complete plate data.
        //    If we (webhook) created a skeleton earlier, verify-payment will overwrite us.
        const orderRef = db.collection('orders').doc(reference);
        const existingDoc = await orderRef.get();

        if (existingDoc.exists) {
            const existingData = existingDoc.data()!;
            if (existingData.source !== 'webhook') {
                // verify-payment already wrote the complete order — don't touch it
                console.log(`[Webhook] Complete order already exists for ref: ${reference}`);
                return res.status(200).json({ received: true, duplicate: true });
            }
            // It's our own webhook skeleton — verify-payment will overwrite later
            console.log(`[Webhook] Webhook skeleton already exists for ref: ${reference}`);
            return res.status(200).json({ received: true, duplicate: true });
        }

        // 4. Try to extract order data from Paystack metadata
        const metadata = paymentData.metadata || {};
        const paidAmount = paymentData.amount / 100;

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

        if (metadata.type === 'combo') {
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
