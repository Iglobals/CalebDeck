import type { firestore } from 'firebase-admin';
import { resolveOrderVertical } from '../src/services/orderVertical.js';
import { isPremiumHostel as sharedIsPremiumHostel } from '../src/services/orderFees.js';
import { resolveHostelRestriction, HostelConfig } from '../src/services/hostels.js';
import { findFashionDeliveryArea, normaliseFashionDeliveryConfig } from './fashion-delivery.js';
import { premiumGroupDeliveryFee, resolveFoodGroupPricing } from '../src/services/groupPricing.js';

const FOOD_PLATE_FEE_FALLBACKS = { foodDeliveryFee: 750, foodGroupDeliveryFee: 580, premiumDeliveryFee: 1250 };

function isPremiumHostelFor(orderData: any, platformSettings: any, hostels?: Partial<HostelConfig>[]): boolean {
    return sharedIsPremiumHostel(orderData?.hostel || orderData?.hostelName || orderData?.hostelId, platformSettings, hostels);
}

export async function validateAndResolveOrderHostel(
    db: firestore.Firestore,
    orderData: any,
    options?: { enforceActiveAndAck?: boolean }
): Promise<{
    valid: boolean;
    code?: string;
    message?: string;
    hostelFields: Record<string, any>;
}> {
    const enforce = options?.enforceActiveAndAck ?? true;

    const cleanStr = (val: any): string => {
        if (val === null || val === undefined) return '';
        const s = String(val).trim();
        if (!s || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') return '';
        return s;
    };

    const isOffCampus =
        orderData?.customerType === 'GENERAL' ||
        orderData?.deliveryRecipientType === 'NON_STUDENT' ||
        Boolean(orderData?.isOffCampusDelivery);

    if (isOffCampus) {
        const area = cleanStr(orderData?.deliveryAreaName || orderData?.areaName);
        const city = cleanStr(orderData?.deliveryCity || orderData?.city);
        const state = cleanStr(orderData?.deliveryState || orderData?.state);
        const areaLabel = [area, city, state].filter(Boolean).join(', ');
        const street = cleanStr(orderData?.deliveryAddress || orderData?.address || orderData?.streetAddress);
        const displayName = areaLabel || street || cleanStr(orderData?.hostelName) || cleanStr(orderData?.hostel) || 'Off-Campus Delivery';
        return {
            valid: true,
            hostelFields: {
                hostel: displayName,
                hostelId: 'off-campus',
                hostelName: displayName,
                pickupPoint: street || areaLabel || 'Customer delivery address',
                collectionInstruction: cleanStr(orderData?.deliveryAddressDetails || orderData?.addressDetails),
                requiresHostelAcknowledgement: false,
                femaleHostelAgreement: false,
            },
        };
    }

    const rawHostel = cleanStr(orderData?.hostelId) || cleanStr(orderData?.hostel) || cleanStr(orderData?.hostelName);
    if (!rawHostel) {
        if (enforce) {
            return {
                valid: false,
                code: 'HOSTEL_REQUIRED',
                message: 'Please select a valid campus hostel before proceeding.',
                hostelFields: {},
            };
        }
        return { valid: true, hostelFields: {} };
    }

    const [settingsSnap, hostelsSnap] = await Promise.all([
        db.collection('settings').doc('platform').get().catch(() => null),
        db.collection('hostels').limit(100).get().catch(() => null),
    ]);

    const platformSettings = settingsSnap && settingsSnap.exists ? settingsSnap.data() : {};
    const firestoreHostels: Partial<HostelConfig>[] = hostelsSnap
        ? hostelsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Partial<HostelConfig>))
        : [];

    const restriction = resolveHostelRestriction(rawHostel, firestoreHostels, platformSettings as any);

    if (enforce && !restriction.isActive) {
        return {
            valid: false,
            code: 'HOSTEL_DISABLED',
            message: `${restriction.hostelName || 'The selected hostel'} is currently unavailable for new orders. Please choose an active hostel.`,
            hostelFields: {},
        };
    }

    const clientAccepted =
        Boolean(orderData?.hostelAcknowledgement?.accepted) ||
        Boolean(orderData?.femaleHostelAgreement);

    if (enforce && restriction.required && !clientAccepted) {
        return {
            valid: false,
            code: 'HOSTEL_ACKNOWLEDGEMENT_REQUIRED',
            message:
                restriction.message ||
                `Please confirm and accept the collection requirement for ${restriction.hostelName} before continuing.`,
            hostelFields: {},
        };
    }

    const hostelId = cleanStr(restriction.hostelId) || cleanStr(orderData?.hostelId) || cleanStr(orderData?.hostel) || rawHostel;
    const hostelName =
        cleanStr(restriction.hostelName) || cleanStr(orderData?.hostelName) || cleanStr(orderData?.hostel) || rawHostel || 'Campus Hostel';

    const hostelFields: Record<string, any> = {
        hostel: hostelName || hostelId || rawHostel,
        hostelId: hostelId || rawHostel,
        hostelName: hostelName || rawHostel,
        pickupPoint: restriction.pickupPoint || 'Front of your hostel/reception',
        collectionInstruction: restriction.collectionInstruction || '',
        requiresHostelAcknowledgement: restriction.required,
        femaleHostelAgreement: restriction.required ? clientAccepted : false,
        hostelAcknowledgement: {
            required: restriction.required,
            accepted: restriction.required ? clientAccepted : false,
            acceptedAt:
                orderData?.hostelAcknowledgement?.acceptedAt ||
                (restriction.required && clientAccepted ? new Date().toISOString() : null),
            hostelId: hostelId || rawHostel,
            hostelName: hostelName || rawHostel,
            title: restriction.title || '',
            message: restriction.message || '',
            checkboxLabel: restriction.checkboxLabel || '',
            collectionInstruction: restriction.collectionInstruction || '',
            pickupPoint: restriction.pickupPoint || 'Front of your hostel/reception',
            ruleType: restriction.ruleType || 'NONE',
        },
    };

    return { valid: true, hostelFields };
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
    const foodGroup = (!isMartOrder && !isFashionOrder)
        ? resolveFoodGroupPricing(orderData)
        : { deliveryMode: 'solo' as const, groupSize: 1, plateCount: 1, isGroup: false };
    const isGroup = foodGroup.isGroup;

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
    const premiumFee = platformSettings!.premiumDeliveryFee || FOOD_PLATE_FEE_FALLBACKS.premiumDeliveryFee;
    const foodSoloFee = platformSettings!.foodDeliveryFee || FOOD_PLATE_FEE_FALLBACKS.foodDeliveryFee;
    const foodGroupFee = platformSettings!.foodGroupDeliveryFee || FOOD_PLATE_FEE_FALLBACKS.foodGroupDeliveryFee;
    const baseDeliveryFee = isPremium
        ? (isGroup ? premiumGroupDeliveryFee(premiumFee) : premiumFee)
        : isGroup
            ? foodGroupFee
            : foodSoloFee;

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
        const quantity = foodGroup.plateCount;
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

    const plateCount = foodGroup.plateCount;
    const deliveryFee = baseDeliveryFee * plateCount;
    const takeawayFee = 200 * plateCount;
    serverTotal = foodTotal + deliveryFee + takeawayFee;

    return { serverTotal, netDeliveryFee: deliveryFee };
}
