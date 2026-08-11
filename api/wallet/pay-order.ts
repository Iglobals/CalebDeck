import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { adminDb, ensureFirebaseAdmin } from '../../server/firebase-admin.js';
import { calculateServerOrderTotal } from '../server/order-utils.js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
        const { orderData } = req.body;

        if (!orderData) {
            return res.status(400).json({ error: 'orderData is required' });
        }

        const orderId = orderData?.orderId || `CD-${Math.floor(10000 + Math.random() * 90000)}`;
        const isMartOrder = orderData?.orderType === 'mart' || orderData?.type === 'mart';
        const isCombo = orderData?.type === 'combo';

        // Variables to hold computed data for post-transaction use
        let finalAmount = 0;
        let isPreSaved = false;

        // 1. Strict Atomic Transaction
        await db.runTransaction(async (t) => {
            // A. Check user balance
            const userRef = db.collection('users').doc(uid);
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) {
                throw new Error('User profile not found');
            }
            
            const userData = userDoc.data()!;
            const walletBalance = Number(userData.walletBalance || 0);

            // B. Calculate total atomically
            const { serverTotal } = await calculateServerOrderTotal(db, orderData, t);
            finalAmount = serverTotal;

            // C. Enforce balance
            if (walletBalance < serverTotal) {
                throw new Error('Insufficient wallet balance');
            }

            // D. Deduct balance
            t.update(userRef, {
                walletBalance: FieldValue.increment(-serverTotal),
                updatedAt: FieldValue.serverTimestamp()
            });

            // E. Create Wallet Transaction log
            const transactionRef = db.collection('wallet_transactions').doc();
            t.set(transactionRef, {
                userId: uid,
                type: 'debit',
                amount: serverTotal,
                balanceAfter: walletBalance - serverTotal,
                purpose: 'MART_PURCHASE', // Genericize later for other products
                status: 'successful',
                reference: orderId,
                createdAt: FieldValue.serverTimestamp()
            });

            // F. Write Order
            const orderRef = db.collection('orders').doc(orderId); // We use orderId as the doc ID for wallet purchases
            const existingOrder = await t.get(orderRef);
            
            isPreSaved = existingOrder.exists && existingOrder.data()?.source === 'pre_saved';

            const platformFee = 100;
            const processingFee = 200;

            const orderDocBase: any = {
                orderId,
                fullName: orderData?.fullName || orderData?.studentName || '',
                studentName: orderData?.fullName || orderData?.studentName || '',
                phone: orderData?.phone || '',
                hostel: orderData?.hostel || '',
                hostelName: orderData?.hostelName || '',
                instructions: orderData?.instructions || '',
                total: serverTotal,
                cafeteria: orderData?.cafeteria || '',
                cafeteriaId: orderData?.cafeteriaId || '',
                sectionId: orderData?.sectionId || 'none',
                deliveryMode: orderData?.deliveryMode || 'solo',
                deliveryType: orderData?.deliveryType || 'INSTANT',
                paymentReference: `WALLET-${orderId}`,
                paymentMethod: 'WALLET',
                assignedRiderId: null,
                batchId: null,
                status: 'PAID',
                source: 'verified',
                createdAt: existingOrder.exists ? existingOrder.data()?.createdAt : FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            };

            if (orderDocBase.deliveryType === 'BATCH') {
                orderDocBase.foodBatchId = orderData?.selectedBatchId || orderData?.foodBatchId || null;
                orderDocBase.foodBatchName = orderData?.foodBatchName || 'Scheduled Batch';
                orderDocBase.orderWindowStart = orderData?.orderWindowStart || null;
                orderDocBase.orderWindowEnd = orderData?.orderWindowEnd || null;
                orderDocBase.deliveryWindowStart = orderData?.deliveryWindowStart || null;
                orderDocBase.deliveryWindowEnd = orderData?.deliveryWindowEnd || null;
            }

            if (isMartOrder) {
                orderDocBase.type = 'mart';
                orderDocBase.items = orderData.items || [];
                orderDocBase.totalAmount = serverTotal;
                orderDocBase.subtotal = orderData?.subtotal || (serverTotal - (orderData?.deliveryFee || 1500) - platformFee - processingFee);
                orderDocBase.deliveryFee = orderData?.deliveryFee || 1500;
                orderDocBase.serviceProcessingFee = platformFee + processingFee;
                delete orderDocBase.total;
                delete orderDocBase.cafeteria;
                delete orderDocBase.cafeteriaId;
                delete orderDocBase.sectionId;
                delete orderDocBase.deliveryMode;
            } else if (isCombo) {
                orderDocBase.type = 'combo';
                orderDocBase.comboId = orderData.comboId;
                orderDocBase.comboName = orderData.comboName;
                orderDocBase.comboItems = orderData.comboItems || []; 
                orderDocBase.quantity = orderData.quantity || 1;
                orderDocBase.plateCount = orderData.quantity || 1; 
                orderDocBase.basePrice = orderData.basePrice || 0;
            } else {
                orderDocBase.type = 'plate';
                
                // Strip out massive base64 images to prevent 1MB limit crash
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
                orderDocBase.plateCount = orderData?.plateCount || 1;
            }

            // Write order
            t.set(orderRef, orderDocBase, { merge: true });
        });

        // 2. Post-Transaction Actions (Outside the atomic block!)
        // Non-blocking operations so failure here doesn't crash a successful payment
        
        try {
            await db.collection('users').doc(uid).update({
                productsUsed: FieldValue.arrayUnion('CalebDeck Mart') // Will make generic later
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
                const pushLink = isMartOrder ? '/admin/mart/orders' : '/admin/orders';

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
                orderId
            }
        });

    } catch (error: any) {
        console.error('Wallet payment error:', error);
        return res.status(400).json({ error: error.message || 'Wallet payment failed' });
    }
}
