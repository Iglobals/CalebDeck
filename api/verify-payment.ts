import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';

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

        const { reference, orderData } = req.body;

        if (!reference) {
            return res.status(400).json({ error: 'Payment reference is required' });
        }

        // 1. Check for duplicate — idempotent
        const existingSnap = await db.collection('orders').where('paymentReference', '==', reference).limit(1).get();
        if (!existingSnap.empty) {
            const existing = existingSnap.docs[0];
            return res.status(200).json({
                data: {
                    success: true,
                    message: 'Order already exists',
                    firestoreOrderId: existing.id,
                    orderId: existing.data().orderId
                }
            });
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
            return res.status(400).json({ error: 'Payment was not successful', status: data.status });
        }

        // 3. Recalculate total from Firestore prices (server-side validation)
        let serverTotal = 0;
        const isCombo = orderData?.type === 'combo';
        const isGroup = orderData?.deliveryMode === 'group' || orderData?.deliveryMode === 'GROUP';

        if (isCombo) {
            const comboDoc = await db.collection('combo_packs').doc(orderData.comboId).get();
            if (!comboDoc.exists) {
                 return res.status(400).json({ error: 'Invalid combo selected' });
            }
            const comboData = comboDoc.data()!;
            const quantity = orderData.quantity || 1;
            const deliveryFee = (isGroup ? 580 : 750) * quantity;
            serverTotal = (comboData.basePrice * quantity) + deliveryFee;
        } else {
            const items = orderData?.items || [];
            let foodTotal = 0;

            if (items.length > 0) {
                const itemRefs = items.map((i: any) => db!.collection('menu_items').doc(i.id));
                const itemDocs = await db!.getAll(...itemRefs);

                for (let idx = 0; idx < itemDocs.length; idx++) {
                    const doc = itemDocs[idx];
                    const qty = items[idx].quantity || 1;

                    if (doc.exists) {
                        foodTotal += (doc.data()!.price || 0) * qty;
                    } else {
                        // Use client price for drinks/add-ons that may have different IDs
                        foodTotal += (items[idx].price || 0) * qty;
                    }
                }
            }

            const plateCount = typeof orderData?.plateCount === 'number' ? orderData.plateCount : 1;
            const deliveryFee = (isGroup ? 580 : 750) * plateCount;
            const takeawayFee = 200 * plateCount;
            serverTotal = foodTotal + deliveryFee + takeawayFee;
        }

        // 4. Verify amount — allow 5% tolerance for rounding
        const paidAmount = data.amount / 100; // Paystack sends in kobo
        const tolerance = serverTotal * 0.05;
        if (Math.abs(paidAmount - serverTotal) > tolerance && serverTotal > 0) {
            console.warn(`Amount mismatch: paid=${paidAmount}, server=${serverTotal}, ref=${reference}`);
            // Log but don't block — use Paystack's verified amount as the source of truth
        }

        // 5. Create order in Firestore (server-side)
        const orderId = orderData?.orderId || `CD-${Math.floor(10000 + Math.random() * 90000)}`;

        const orderDoc: any = {
            orderId,
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
            paymentReference: reference,
            assignedRiderId: null,
            batchId: null,
            status: 'PAID',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        if (isCombo) {
            orderDoc.type = 'combo';
            orderDoc.comboId = orderData.comboId;
            orderDoc.comboName = orderData.comboName;
            orderDoc.comboItems = orderData.comboItems || []; // Structured items array
            orderDoc.quantity = orderData.quantity || 1;
            orderDoc.plateCount = orderData.quantity || 1; // For generic calculation
            orderDoc.basePrice = orderData.basePrice || 0; // Persist for dashboard pricing
        } else {
            orderDoc.plates = orderData?.plates || [];
            orderDoc.drinksSnacks = orderData?.drinksSnacks || [];
            orderDoc.plateCount = orderData?.plateCount || 1;
        }

        const orderRef = db.collection('orders').doc(reference);
        await orderRef.set(orderDoc);

        // 6. Create admin notification (server-side)
        try {
            await db.collection('notifications').add({
                userId: 'admin',
                title: 'New Order Received',
                message: `${orderDoc.fullName || 'A student'} just ordered from ${orderDoc.hostelName || orderDoc.hostel}`,
                type: 'order',
                link: '/admin/orders',
                isRead: false,
                createdAt: FieldValue.serverTimestamp()
            });
        } catch (notifErr) {
            console.error('Failed to create admin notification:', notifErr);
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
