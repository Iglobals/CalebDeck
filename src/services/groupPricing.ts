/**
 * Authoritative food group-order rules.
 *
 * These match the plate-builder UI:
 * - Solo uses the solo delivery fee.
 * - Group uses the group delivery fee only when group size is one of 2, 4, 6, 8, 10
 *   and the order has at least that many plates.
 * - Premium hostels keep the existing 20% group discount on the premium fee.
 * - Combos have no group-size picker; a combo marked group must have quantity >= 2.
 */
export const ALLOWED_GROUP_SIZES = [2, 4, 6, 8, 10] as const;

export type AllowedGroupSize = (typeof ALLOWED_GROUP_SIZES)[number];

export class GroupOrderError extends Error {
    code = 'GROUP_SIZE_INVALID';
    constructor(message: string) {
        super(message);
        this.name = 'GroupOrderError';
    }
}

export function isAllowedGroupSize(value: unknown): value is AllowedGroupSize {
    return ALLOWED_GROUP_SIZES.includes(Number(value) as AllowedGroupSize);
}

export function resolveFoodGroupPricing(orderData: any): {
    deliveryMode: 'solo' | 'group';
    groupSize: number;
    plateCount: number;
    isGroup: boolean;
} {
    const isCombo = orderData?.type === 'combo';
    const countedPlates = Array.isArray(orderData?.plates) ? orderData.plates.length : 0;
    const declaredPlates = Number(orderData?.plateCount);
    const comboQuantity = Number(orderData?.quantity) || 1;
    const plateCount = isCombo
        ? comboQuantity
        : Math.max(
            countedPlates,
            Number.isFinite(declaredPlates) && declaredPlates > 0 ? declaredPlates : 0,
            1
        );

    const rawMode = String(orderData?.deliveryMode || 'solo').trim().toLowerCase();
    const wantsGroup = rawMode === 'group';

    if (!wantsGroup) {
        return { deliveryMode: 'solo', groupSize: 1, plateCount, isGroup: false };
    }

    let groupSize = Number(orderData?.groupSize);

    if (isCombo) {
        if (!Number.isInteger(groupSize) || groupSize < 2) {
            groupSize = plateCount;
        }
        if (plateCount < 2) {
            throw new GroupOrderError('A combo group order needs at least 2 combos.');
        }
        if (plateCount < groupSize) {
            throw new GroupOrderError(`This group order needs at least ${groupSize} combos.`);
        }
        return { deliveryMode: 'group', groupSize, plateCount, isGroup: true };
    }

    if (!isAllowedGroupSize(groupSize)) {
        throw new GroupOrderError('Group size must be 2, 4, 6, 8 or 10.');
    }
    if (plateCount < groupSize) {
        throw new GroupOrderError(`This group order needs at least ${groupSize} plates.`);
    }

    return { deliveryMode: 'group', groupSize, plateCount, isGroup: true };
}

export function premiumGroupDeliveryFee(premiumFee: number): number {
    return Math.round(Number(premiumFee) * 0.8);
}

/**
 * Calculates the group delivery fee per plate for instant orders.
 * If an explicit instantGroupDeliveryFee is configured in platformSettings, that is used;
 * otherwise, it defaults to the authoritative 20% group discount on the instant solo fee.
 */
export function instantGroupDeliveryFee(instantSoloFee: number, settings?: any): number {
    const configured = Number(settings?.instantGroupDeliveryFee);
    if (Number.isFinite(configured) && configured > 0) {
        return configured;
    }
    return Math.round(Number(instantSoloFee) * 0.8);
}

export interface FoodDeliveryPricingResult {
    grossFeePerPlate: number;
    netFeePerPlate: number;
    discountPerPlate: number;
    totalGrossDelivery: number;
    totalNetDelivery: number;
    totalDiscount: number;
}

/**
 * Authoritative single source of truth for food delivery pricing (solo, group, instant, scheduled, premium).
 */
export function resolveFoodDeliveryPricing(params: {
    isInstant: boolean;
    isGroup: boolean;
    isPremium: boolean;
    plateCount: number;
    platformSettings?: any;
}): FoodDeliveryPricingResult {
    const { isInstant, isGroup, isPremium, plateCount, platformSettings } = params;
    const count = Math.max(1, Number(plateCount) || 1);

    const premiumFee = Number(platformSettings?.premiumDeliveryFee) > 0
        ? Number(platformSettings.premiumDeliveryFee)
        : 1250;

    const scheduledSoloFee = Number(platformSettings?.foodDeliveryFee) > 0
        ? Number(platformSettings.foodDeliveryFee)
        : 750;

    const scheduledGroupFee = Number(platformSettings?.foodGroupDeliveryFee) > 0
        ? Number(platformSettings.foodGroupDeliveryFee)
        : 580;

    const instantSoloFee = Number(platformSettings?.instantDeliveryFee) > 0
        ? Number(platformSettings.instantDeliveryFee)
        : 700;

    const instantGroupFee = instantGroupDeliveryFee(instantSoloFee, platformSettings);

    let grossFeePerPlate: number;
    let netFeePerPlate: number;

    if (isPremium) {
        grossFeePerPlate = premiumFee;
        netFeePerPlate = isGroup ? premiumGroupDeliveryFee(premiumFee) : premiumFee;
    } else if (isInstant) {
        grossFeePerPlate = instantSoloFee;
        netFeePerPlate = isGroup ? instantGroupFee : instantSoloFee;
    } else {
        grossFeePerPlate = scheduledSoloFee;
        netFeePerPlate = isGroup ? scheduledGroupFee : scheduledSoloFee;
    }

    const discountPerPlate = isGroup ? Math.max(0, grossFeePerPlate - netFeePerPlate) : 0;
    const totalGrossDelivery = grossFeePerPlate * count;
    const totalNetDelivery = netFeePerPlate * count;
    const totalDiscount = discountPerPlate * count;

    return {
        grossFeePerPlate,
        netFeePerPlate,
        discountPerPlate,
        totalGrossDelivery,
        totalNetDelivery,
        totalDiscount,
    };
}
