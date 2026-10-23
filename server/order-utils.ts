import type { firestore } from 'firebase-admin';
import { resolveOrderVertical } from '../src/services/orderVertical.js';
import { isPremiumHostel as sharedIsPremiumHostel } from '../src/services/orderFees.js';
import { findFashionDeliveryArea, normaliseFashionDeliveryConfig } from './fashion-delivery.js';

const FOOD_PLATE_FEE_FALLBACKS = { foodDeliveryFee: 750, foodGroupDeliveryFee: 580, premiumDeliveryFee: 1250 };

function isPremiumHostelFor(orderData: any, platformSettings: any): boolean {
    return sharedIsPremiumHostel(orderData?.hostel || orderData?.hostelName || orderData?.hostelId, platformSettings);
}

export async function calculateServerOrderTotal(
    db: firestore.Firestore,
    orderData: any,
    transaction?: firestore.Transaction
): Promise<{ serverTotal: number; netDeliveryFee: number; pricedItems?: any[]; itemsDocs?: any[]; comboDoc?: any; paidAmountExpected?: number }> {
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

    let serverTotal = 0;

    if (isFashionOrder) {
        // Fashion is a flat per-order fee — it never inherits Food's premium hostel rate.
        let fashionDeliveryFee = Number(platformSettings!.fashionDeliveryFee) || 1500;
        if (orderData?.customerType === 'GENERAL') {
            const deliveryConfig = normaliseFashionDeliveryConfig(platformSettings?.fashionDeliveryConfig);
            if (!deliveryConfig.nonStudentDeliveryEnabled || !deliveryConfig.pilotEnabled) throw new Error('GENERAL_FASHION_DELIVERY_DISABLED');
            const match = findFashionDeliveryArea(deliveryConfig, String(orderData?.areaId || ''));
            if (!match || !match.zone.enabled || !match.area.enabled) throw new Error('FASHION_DELIVERY_AREA_UNAVAILABLE');
            if (match.area.pricingMode === 'RANGE') {
                const confirmedFee = Number(orderData?.confirmedDeliveryFee);
                if (!(confirmedFee >= Number(match.area.minFee) && confirmedFee <= Number(match.area.maxFee))) throw new Error('FASHION_DELIVERY_FEE_CONFIRMATION_REQUIRED');
                fashionDeliveryFee = confirmedFee;
            } else {
                fashionDeliveryFee = Number(match.area.fixedFee);
            }
        }
        const items = orderData?.items || [];
        let fashionTotal = 0;
        const pricedItems: any[] = [];
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
                const fashionData = doc.exists ? doc.data()! : null;
                const variationIndex = items[idx].variationIndex;
                const variationPrice = variationIndex !== undefined && variationIndex !== null
                    ? Number(fashionData?.variationPricesByIndex?.[String(variationIndex)])
                    : 0;
                const currentPrice = variationPrice > 0
                    ? variationPrice
                    : fashionData
                        ? Number(fashionData.price) || 0
                        : (items[idx].price || 0);
                fashionTotal += currentPrice * qty;
                pricedItems.push({ ...items[idx], price: currentPrice });
            }
        }
        serverTotal = fashionTotal + fashionDeliveryFee;
        return { serverTotal, netDeliveryFee: fashionDeliveryFee, pricedItems };
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
        serverTotal = martTotal + martDeliveryFee;
        return { serverTotal, netDeliveryFee: martDeliveryFee };
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

        serverTotal = (comboData.basePrice * quantity) + deliveryFee;
        return { serverTotal, netDeliveryFee: deliveryFee, comboDoc: comboData };
    }

    // Food Plate Order — food orders carry a flat `items` array (wallet path)
    // or `plates` (client plate-builder); price both through menu_items.
    const flatItems: any[] = Array.isArray(orderData?.items) ? [...orderData.items] : [];
    for (const plate of (orderData?.plates || [])) {
        for (const plateItem of (plate?.items || [])) {
            flatItems.push({
                id: plateItem?.item?.id || plateItem?.id,
                price: plateItem?.item?.price || plateItem?.price || 0,
                quantity: plateItem?.quantity || 1,
                isAddon: plateItem?.isAddon,
            });
        }
    }
    const items = flatItems;
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
    serverTotal = foodTotal + deliveryFee + takeawayFee;

    return { serverTotal, netDeliveryFee: deliveryFee };
}
