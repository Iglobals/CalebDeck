import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../server/firebase-admin.js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

/**
 * PRE-SAVE ORDER
 * 
 * Called BEFORE Paystack payment to save the complete order data
 * (plates, items, student info) to Firestore with status PENDING_PAYMENT.
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
        console.log(`[pre-save] Saved order ${orderData.orderId} with ref: ${reference}`);

        return res.status(200).json({ success: true, reference });
    } catch (error: any) {
        console.error('[pre-save] Error:', error);
        return res.status(500).json({ error: 'Failed to pre-save order' });
    }
}
