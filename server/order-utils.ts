import type { firestore } from 'firebase-admin';
import { resolveOrderVertical } from '../src/services/orderVertical.js';
import { isPremiumHostel as sharedIsPremiumHostel } from '../src/services/orderFees.js';

const FOOD_PLATE_FEE_FALLBACKS = { foodDeliveryFee: 750, foodGroupDeliveryFee: 580, premiumDeliveryFee: 1250 };

function isPremiumHostelFor(orderData: any, platformSettings: any): boolean {
    return sharedIsPremiumHostel(orderData?.hostel || orderData?.hostelName || orderData?.hostelId, platformSettings);
}

export async function calculateServerOrderTotal(
    db: firestore.Firestore,
    orderData: any,
    transaction?: firestore.Transaction
): Promise<{ serverTotal: number; itemsDocs?: any[]; comboDoc?: any; paidAmountExpected?: number }> {
    const vertical = resolveOrderVertical(orderData);
    const isMartOrder = vertical === 'MART';
    const isFashionOrder = vertical === 'FASHION';
    const isCombo = orderData?.type === 'combo';
    const isGroup = orderData?.deliveryMode === 'group' || orderData?.deliveryMode === 'GROUP';

    const settingsRef = db.collection('settings').doc('platform');
    let settingsDoc;
    if (transaction) {
        settingsDoc = await transaction.get(settingsRef);
    } else {
        settingsDoc = await settingsRef.get();
    }
    const platformSettings = settingsDoc.exists ? settingsDoc.data() : {};
    const isPremium = isPremiumHostelFor(orderData, platformSettings);

    const platformFee = 100;
    const processingFee = 200;

    let serverTotal = 0;

    if (isFashionOrder) {
        // Fashion is a flat per-order fee — it never inherits Food's premium hostel rate.
        const fashionDeliveryFee = Number(orderData?.deliveryFee) > 0
            ? Number(orderData.deliveryFee)
            : (platformSettings!.fashionDeliveryFee || 1500);
        const items = orderData?.items || [];
        let fashionTotal = 0;
        if (items.length > 0) {
            const itemRefs = items.map((i: any) => db.collection('fashion_inventory').doc(i.id));
            let itemDocs: firestore.DocumentSnapshot[] = [];
            if (transaction) {
                itemDocs = await transaction.getAll(...itemRefs);
            } else {
                itemDocs = await db.getAll(...itemRefs);
            }
            for (let idx = 0; idx < itemDocs.length; idx++) {
                const doc = itemDocs[idx];
                const qty = items[idx].quantity || 1;
                const currentPrice = doc.exists ? (doc.data()!.price || 0) : (items[idx].price || 0);
                fashionTotal += currentPrice * qty;
            }
        }
        serverTotal = fashionTotal + fashionDeliveryFee + platformFee + processingFee;
        return { serverTotal };
    }

    if (isMartOrder) {
        const items = orderData?.items || [];
        let martTotal = 0;
        const martDeliveryFee = Number(orderData?.deliveryFee) > 0
            ? Number(orderData.deliveryFee)
            : (platformSettings!.martDeliveryFee || 1500);

        if (items.length > 0) {
            const itemRefs = items.map((i: any) => db.collection('mart_items').doc(i.id));
            let itemDocs: firestore.DocumentSnapshot[] = [];

            if (transaction) {
                // transaction.getAll requires refs passed as arguments
                itemDocs = await transaction.getAll(...itemRefs);
            } else {
                itemDocs = await db.getAll(...itemRefs);
            }

            for (let idx = 0; idx < itemDocs.length; idx++) {
                const doc = itemDocs[idx];
                const qty = items[idx].quantity || 1;
                const currentPrice = doc.exists ? (doc.data()!.price || 0) : (items[idx].price || 0);
                martTotal += currentPrice * qty;
            }
        }
        serverTotal = martTotal + martDeliveryFee + platformFee + processingFee;
        return { serverTotal };
    }

    // Food (plate or combo) — premium hostel rate only applies to food orders.
    const baseDeliveryFee = isPremium
        ? (platformSettings!.premiumDeliveryFee || FOOD_PLATE_FEE_FALLBACKS.premiumDeliveryFee)
        : isGroup
            ? (platformSettings!.foodGroupDeliveryFee || FOOD_PLATE_FEE_FALLBACKS.foodGroupDeliveryFee)
            : (platformSettings!.foodDeliveryFee || FOOD_PLATE_FEE_FALLBACKS.foodDeliveryFee);

    if (isCombo) {
        const comboRef = db.collection('combo_packs').doc(orderData.comboId);
        let comboDoc;
        if (transaction) {
            comboDoc = await transaction.get(comboRef);
        } else {
            comboDoc = await comboRef.get();
        }

        if (!comboDoc.exists) {
             throw new Error('Invalid combo selected');
        }

        const comboData = comboDoc.data()!;
        const quantity = orderData.quantity || 1;
        const deliveryFee = baseDeliveryFee * quantity;

        serverTotal = (comboData.basePrice * quantity) + deliveryFee + platformFee + processingFee;
        return { serverTotal, comboDoc: comboData };
    }

    // Food Plate Order
    const items = orderData?.items || [];
    let foodTotal = 0;

    if (items.length > 0) {
        const itemRefs = items.map((i: any) => db.collection('menu_items').doc(i.id));
        let itemDocs: firestore.DocumentSnapshot[] = [];

        if (transaction) {
            itemDocs = await transaction.getAll(...itemRefs);
        } else {
            itemDocs = await db.getAll(...itemRefs);
        }

        for (let idx = 0; idx < itemDocs.length; idx++) {
            const doc = itemDocs[idx];
            const qty = items[idx].quantity || 1;
            let currentPrice = 0;

            if (doc.exists) {
                currentPrice = doc.data()!.price || 0;
            } else {
                currentPrice = items[idx].price || 0;
            }

            if (items[idx].isAddon && currentPrice < 1000) {
                currentPrice += 50;
            }

            foodTotal += currentPrice * qty;
        }
    }

    const plateCount = typeof orderData?.plateCount === 'number' ? orderData.plateCount : 1;
    const deliveryFee = baseDeliveryFee * plateCount;
    const takeawayFee = 200 * plateCount;
    serverTotal = foodTotal + deliveryFee + takeawayFee + platformFee + processingFee;

    return { serverTotal };
}
