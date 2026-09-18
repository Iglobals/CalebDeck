/**
 * Launch promo: first N ICA (i-CON) food orders get a % off the delivery fee.
 *
 * Config lives on settings/platform so admin can change percent and how many
 * people qualify without another code change. Claiming is server-side only.
 */

export const FIRST_ORDER_DISCOUNT_COLLECTION = 'first_order_discount_claims';

export interface FirstOrderDiscountSettings {
    enabled: boolean;
    percentOff: number;
    maxOrders: number;
    claimedCount: number;
}

export interface FirstOrderDiscountPreview {
    amount: number;
    percentOff: number;
    maxOrders: number;
    remaining: number;
    slotNumber: number;
    message: string;
    headline: string;
}

function toNonNegInt(value: any, fallback = 0): number {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toPercent(value: any, fallback = 0): number {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(100, Math.max(0, n));
}

export function readFirstOrderDiscountSettings(settings: any): FirstOrderDiscountSettings {
    return {
        enabled: settings?.firstOrderDiscountEnabled === true,
        percentOff: toPercent(settings?.firstOrderDiscountPercent, 0),
        maxOrders: toNonNegInt(settings?.firstOrderDiscountMaxOrders, 0),
        claimedCount: toNonNegInt(settings?.firstOrderDiscountClaimedCount, 0),
    };
}

export function hasIcaAccount(user: any): boolean {
    return !!user?.icaSub;
}

export function computeFirstOrderDiscountAmount(netDeliveryFee: number, percentOff: number): number {
    const delivery = Number(netDeliveryFee) || 0;
    const percent = toPercent(percentOff, 0);
    if (delivery <= 0 || percent <= 0) return 0;
    return Math.round(delivery * (percent / 100));
}

export function firstOrderDiscountHeadline(maxOrders: number): string {
    if (maxOrders <= 1) return "You're the first person to order food on CalebDeck";
    return `You're one of the first ${maxOrders} people to order food on CalebDeck`;
}

export function firstOrderDiscountMessage(percentOff: number, maxOrders: number): string {
    const headline = firstOrderDiscountHeadline(maxOrders);
    return `${headline}, so you get ${percentOff}% off your delivery fee.`;
}

export function netDeliveryFeeFromBreakdown(breakdown: any): number {
    const delivery = Number(breakdown?.delivery) || 0;
    const groupDiscount = Number(breakdown?.discount) || 0;
    return Math.max(0, delivery - groupDiscount);
}

/**
 * Client-side preview only. The real grant happens atomically on the server
 * when the food order is paid, so two people cannot take the same slot.
 */
export function previewFirstOrderDiscount(args: {
    settings: any;
    user: any;
    netDeliveryFee: number;
}): FirstOrderDiscountPreview | null {
    const cfg = readFirstOrderDiscountSettings(args.settings);
    if (!cfg.enabled || cfg.percentOff <= 0 || cfg.maxOrders <= 0) return null;
    if (!hasIcaAccount(args.user)) return null;
    if (args.user?.firstOrderDiscountClaimed === true) return null;
    if (cfg.claimedCount >= cfg.maxOrders) return null;

    const amount = computeFirstOrderDiscountAmount(args.netDeliveryFee, cfg.percentOff);
    if (amount <= 0) return null;

    const remaining = Math.max(0, cfg.maxOrders - cfg.claimedCount);
    const slotNumber = cfg.claimedCount + 1;

    return {
        amount,
        percentOff: cfg.percentOff,
        maxOrders: cfg.maxOrders,
        remaining,
        slotNumber,
        headline: firstOrderDiscountHeadline(cfg.maxOrders),
        message: firstOrderDiscountMessage(cfg.percentOff, cfg.maxOrders),
    };
}

export function firstOrderDiscountOrderFields(
    preview: { amount: number; percentOff: number; maxOrders: number; slotNumber: number; message: string },
    existingBreakdown?: any
) {
    const fields: Record<string, any> = {
        firstOrderDiscount: {
            applied: true,
            percentOff: preview.percentOff,
            amount: preview.amount,
            slotNumber: preview.slotNumber,
            maxOrders: preview.maxOrders,
            message: preview.message,
        },
    };
    if (existingBreakdown && typeof existingBreakdown === 'object') {
        fields.breakdown = {
            ...existingBreakdown,
            firstOrderDiscount: preview.amount,
            firstOrderDiscountPercent: preview.percentOff,
        };
    }
    return fields;
}
