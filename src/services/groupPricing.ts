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
