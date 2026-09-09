/**
 * Single source of truth for classifying an order into a vertical.
 *
 * Order docs are written by several paths (pre-save, verify-payment, webhook,
 * wallet) and legacy docs may carry only some markers, so resolution goes from
 * the most explicit field (orderType) down to the weakest (cafeteria label).
 * Untyped docs with no markers at all resolve to FOOD — that matches the
 * fix-forward decision for legacy plate-shaped docs.
 */
export type OrderVertical = 'FOOD' | 'FASHION' | 'MART';

export function resolveOrderVertical(order: any): OrderVertical {
    if (!order) return 'FOOD';

    const orderType = String(order.orderType ?? '').trim().toUpperCase();
    if (orderType === 'FASHION') return 'FASHION';
    if (orderType === 'MART') return 'MART';
    if (orderType === 'FOOD') return 'FOOD';

    const type = String(order.type ?? '').trim().toLowerCase();
    if (type === 'fashion') return 'FASHION';
    if (type === 'mart') return 'MART';
    if (type === 'plate' || type === 'combo' || type === 'food') return 'FOOD';

    const cafeteria = String(order.cafeteria ?? '').trim().toLowerCase();
    if (cafeteria === 'calebdeck fashion') return 'FASHION';
    if (cafeteria === 'calebdeck mart') return 'MART';

    return 'FOOD';
}

export const isFashionOrder = (order: any): boolean => resolveOrderVertical(order) === 'FASHION';
export const isMartOrder = (order: any): boolean => resolveOrderVertical(order) === 'MART';
export const isFoodOrder = (order: any): boolean => resolveOrderVertical(order) === 'FOOD';

/** Human-readable item count across verticals (fashion/mart use `items`, food uses plates/combo quantity). */
export function getOrderItemCount(order: any): number {
    if (!order) return 0;
    if (Array.isArray(order.items) && order.items.length > 0) {
        return order.items.reduce((sum: number, i: any) => sum + (Number(i?.quantity) || 1), 0);
    }
    if (resolveOrderVertical(order) === 'FASHION' || resolveOrderVertical(order) === 'MART') {
        return Array.isArray(order.items) ? order.items.length : 0;
    }
    if (Array.isArray(order.plates) && order.plates.length > 0) return order.plates.length;
    return Number(order.plateCount ?? order.quantity ?? 0) || 0;
}
