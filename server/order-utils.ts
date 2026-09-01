import type { firestore } from 'firebase-admin';

export async function calculateServerOrderTotal(
    db: firestore.Firestore,
    orderData: any,
    transaction?: firestore.Transaction
): Promise<{ serverTotal: number; itemsDocs?: any[]; comboDoc?: any; paidAmountExpected?: number }> {
    const isMartOrder = orderData?.orderType === 'mart' || orderData?.type === 'mart';
    const isCombo = orderData?.type === 'combo';
    const isGroup = orderData?.deliveryMode === 'group' || orderData?.deliveryMode === 'GROUP';
    const isPremiumHostel = ['sussana', 'rebecca', 'mary', 'esme', 'deborah', 'mercy'].includes((orderData?.hostel || orderData?.hostelName || '').toString().toLowerCase());

    const settingsRef = db.collection('settings').doc('platform');
    let settingsDoc;
    if (transaction) {
        settingsDoc = await transaction.get(settingsRef);
    } else {
        settingsDoc = await settingsRef.get();
    }
    const platformSettings = settingsDoc.exists ? settingsDoc.data() : {};
    const premiumDeliveryFee = platformSettings!.premiumDeliveryFee || 1250;

    let baseDeliveryFee = isGroup
        ? (platformSettings!.foodGroupDeliveryFee || 580)
        : (platformSettings!.foodDeliveryFee || 750);
    if (isPremiumHostel) {
        baseDeliveryFee = premiumDeliveryFee;
    }

    const platformFee = 100;
    const processingFee = 200;

    let serverTotal = 0;

    if (isMartOrder) {
        const items = orderData?.items || [];
        let martTotal = 0;
        const martDeliveryFee = orderData?.deliveryFee || platformSettings!.martDeliveryFee || 1500;
        
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
