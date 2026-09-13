/**
 * Single source of truth for delivery fees across verticals.
 *
 * Rates come from Platform Settings (settings/platform in Firestore) so admins
 * can edit them; the numbers here are only fallbacks for when settings are
 * missing. Fashion and Mart are flat per-order fees and NEVER inherit Food's
 * girls'-hostel premium — the premium only applies inside the FOOD branch.
 */
import { resolveOrderVertical, type OrderVertical } from './orderVertical.js';

export const DEFAULT_PREMIUM_HOSTELS = ['sussana', 'rebecca', 'mary', 'esme', 'deborah', 'mercy'];

export const FEE_DEFAULTS = {
    foodDeliveryFee: 750,
    foodGroupDeliveryFee: 580,
    premiumDeliveryFee: 1250,
    martDeliveryFee: 1500,
    fashionDeliveryFee: 1500,
} as const;

const normalizeHostelKey = (value: any) =>
    String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\s+hall$/, '');

/** Girls'-hostel premium list is admin-editable via Platform Settings (`premiumHostels`). */
export function isPremiumHostel(hostel: any, settings?: any): boolean {
    const list: string[] =
        Array.isArray(settings?.premiumHostels) && settings.premiumHostels.length > 0
            ? settings.premiumHostels
            : DEFAULT_PREMIUM_HOSTELS;
    const key = normalizeHostelKey(hostel);
    return list.some(h => normalizeHostelKey(h) === key);
}

export interface DeliveryFeeResult {
    vertical: OrderVertical;
    /** Total delivery fee charged for the whole order. */
    deliveryFee: number;
    /** Per-plate (food) or flat (fashion/mart) base rate before multiplying. */
    baseDeliveryFee: number;
    isPremium: boolean;
}

function feeFromSettings(settings: any, key: string, fallback: number): number {
    const value = Number(settings?.[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Canonical delivery fee for an order, scoped by vertical.
 * For FASHION/MART a positive `order.deliveryFee` (what the checkout computed
 * and what will be/is charged) wins over the settings value.
 */
export function resolveDeliveryFee(order: any, settings?: any): DeliveryFeeResult {
    const vertical = resolveOrderVertical(order);
    const hostel = order?.hostel || order?.hostelName || order?.hostelId;
    const isPremium = isPremiumHostel(hostel, settings);

    if (vertical === 'FASHION') {
        const fee = Number(order?.deliveryFee) > 0
            ? Number(order.deliveryFee)
            : feeFromSettings(settings, 'fashionDeliveryFee', FEE_DEFAULTS.fashionDeliveryFee);
        return { vertical, deliveryFee: fee, baseDeliveryFee: fee, isPremium };
    }

    if (vertical === 'MART') {
        const fee = Number(order?.deliveryFee) > 0
            ? Number(order.deliveryFee)
            : feeFromSettings(settings, 'martDeliveryFee', FEE_DEFAULTS.martDeliveryFee);
        return { vertical, deliveryFee: fee, baseDeliveryFee: fee, isPremium };
    }

    // FOOD — premium/goup/solo rate × plate count
    const plateCount = Number(
        order?.plateCount ?? order?.quantity ?? (Array.isArray(order?.plates) ? order.plates.length : 1)
    ) || 1;
    const isGroup = String(order?.deliveryMode ?? '').trim().toLowerCase() === 'group';
    const base = isPremium
        ? feeFromSettings(settings, 'premiumDeliveryFee', FEE_DEFAULTS.premiumDeliveryFee)
        : isGroup
            ? feeFromSettings(settings, 'foodGroupDeliveryFee', FEE_DEFAULTS.foodGroupDeliveryFee)
            : feeFromSettings(settings, 'foodDeliveryFee', FEE_DEFAULTS.foodDeliveryFee);
    return { vertical, deliveryFee: base * plateCount, baseDeliveryFee: base, isPremium };
}

export const TAKEAWAY_FEE_PER_PLATE = 200;
export const PLATFORM_FEE = 100;
export const PROCESSING_FEE = 200;

/**
 * Rider payout for one delivered order — vertical-aware, mirroring the
 * admin-configured rates in Platform Settings. Fashion/Mart are flat per-order
 * rates and never inherit Food's premium hostel rate. Emergency multipliers and
 * refund adjustments are call-site policy, not part of this helper.
 */
export function riderEarningForOrder(order: any, settings?: any): number {
    const vertical = resolveOrderVertical(order);
    if (vertical === 'FASHION') return Number(settings?.fashionRatePerDelivery) || 500;
    if (vertical === 'MART') return Number(settings?.martRatePerDelivery) || 500;
    const isCombo = order?.type === 'combo';
    const platesCount = isCombo ? (order?.quantity || 1) : (order?.plates?.length || 1);
    const isGroup = order?.deliveryMode === 'group' || order?.deliveryMode === 'GROUP';
    const isPremium = isPremiumHostel(order?.hostel || order?.hostelName, settings);
    const rate = isPremium
        ? (settings?.premiumRiderRate || 750)
        : isCombo
            ? (settings?.comboRatePerDelivery || 250)
            : isGroup
                ? (settings?.groupRatePerDelivery || 200)
                : (settings?.riderRatePerDelivery || 350);
    return platesCount * rate;
}
