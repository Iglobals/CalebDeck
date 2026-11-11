/**
 * Single source of truth for delivery fees across verticals.
 *
 * Rates come from Platform Settings (settings/platform in Firestore) so admins
 * can edit them; the numbers here are only fallbacks for when settings are
 * missing. Fashion and Mart are flat per-order fees and NEVER inherit Food's
 * girls'-hostel premium — the premium only applies inside the FOOD branch.
 */
import { resolveOrderVertical, type OrderVertical } from './orderVertical.js';
import { findHostelConfig, isDavidHostelKey } from './hostels.js';
import { premiumGroupDeliveryFee, resolveFoodDeliveryPricing, instantGroupDeliveryFee } from './groupPricing.js';

export const DEFAULT_PREMIUM_HOSTELS = ['sussana', 'rebecca', 'mary', 'esme', 'deborah', 'mercy'];

export const FEE_DEFAULTS = {
    foodDeliveryFee: 750,
    instantDeliveryFee: 700,
    foodGroupDeliveryFee: 580,
    premiumDeliveryFee: 1250,
    martDeliveryFee: 1500,
    fashionDeliveryFee: 1500,
} as const;

const normalizeHostelKey = (value: any) =>
    String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/['’`]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s+(hall|hostel)$/, '');

/** Girls'-hostel / premium delivery list is admin-editable via Platform Settings (`premiumHostels` & `hostelConfigs`). */
export function isPremiumHostel(hostel: any, settings?: any, hostels?: any[]): boolean {
    const key = normalizeHostelKey(hostel);
    if (!key) return false;

    const matchedConfig = findHostelConfig(String(hostel), hostels, settings);
    if (matchedConfig && typeof matchedConfig.isPremiumDelivery === 'boolean') {
        return matchedConfig.isPremiumDelivery;
    }

    if (isDavidHostelKey(key)) {
        return false;
    }

    const list: string[] =
        Array.isArray(settings?.premiumHostels) && settings.premiumHostels.length > 0
            ? settings.premiumHostels
            : DEFAULT_PREMIUM_HOSTELS;
    return list.some(h => normalizeHostelKey(h) === key);
}

export interface DeliveryFeeResult {
    vertical: OrderVertical;
    /** Total delivery fee charged for the whole order (net of group discount). */
    deliveryFee: number;
    /** Per-plate (food) or flat (fashion/mart) base rate before multiplying (net of group discount). */
    baseDeliveryFee: number;
    isPremium: boolean;
    /** Per-plate (food) or flat (fashion/mart) gross rate before group discount. */
    grossBaseDeliveryFee?: number;
    /** Total gross delivery fee before group discount. */
    grossDeliveryFee?: number;
    /** Total group discount deducted from delivery fee. */
    discount?: number;
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
        return {
            vertical,
            deliveryFee: fee,
            baseDeliveryFee: fee,
            grossBaseDeliveryFee: fee,
            grossDeliveryFee: fee,
            discount: 0,
            isPremium,
        };
    }

    if (vertical === 'MART') {
        const fee = Number(order?.deliveryFee) > 0
            ? Number(order.deliveryFee)
            : feeFromSettings(settings, 'martDeliveryFee', FEE_DEFAULTS.martDeliveryFee);
        return {
            vertical,
            deliveryFee: fee,
            baseDeliveryFee: fee,
            grossBaseDeliveryFee: fee,
            grossDeliveryFee: fee,
            discount: 0,
            isPremium,
        };
    }

    // FOOD — premium/group/solo rate × plate count
    const plateCount = Number(
        order?.plateCount ?? order?.quantity ?? (Array.isArray(order?.plates) ? order.plates.length : 1)
    ) || 1;
    const isGroup = String(order?.deliveryMode ?? '').trim().toLowerCase() === 'group';
    const isInstant = String(order?.deliveryType ?? '').trim().toUpperCase() === 'INSTANT';
    const pricing = resolveFoodDeliveryPricing({
        isInstant,
        isGroup,
        isPremium,
        plateCount,
        platformSettings: settings,
    });

    return {
        vertical,
        deliveryFee: pricing.totalNetDelivery,
        baseDeliveryFee: pricing.netFeePerPlate,
        grossBaseDeliveryFee: pricing.grossFeePerPlate,
        grossDeliveryFee: pricing.totalGrossDelivery,
        discount: pricing.totalDiscount,
        isPremium,
    };
}

export const TAKEAWAY_FEE_PER_PLATE = 200;
export const PLATFORM_FEE = 100;
export const PROCESSING_FEE = 200;
export const ADDON_MARKUP_THRESHOLD = 1000;
export const ADDON_MARKUP_AMOUNT = 50;

/**
 * Intentional CalebDeck business rule:
 * Qualifying add-ons (drinks/snacks) priced below ₦1,000 attract an additional ₦50.
 * Non-add-on items and add-ons priced at ₦1,000 or above are unchanged.
 */
export function applyQualifyingAddonMarkup(price: number, isAddon: boolean = true): number {
    let currentPrice = Number(price) || 0;
    if (isAddon && currentPrice < ADDON_MARKUP_THRESHOLD) {
        currentPrice += ADDON_MARKUP_AMOUNT;
    }
    return currentPrice;
}

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
