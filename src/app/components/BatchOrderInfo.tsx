import { Clock, Package } from 'lucide-react';
import type { FoodBatchDay } from '../../services/batchSchedule';

type BatchOrderInfoProps = {
  order: any;
  batchDays?: FoodBatchDay[];
  compact?: boolean;
  className?: string;
};

export type ResolvedBatchInfo = {
  batchId?: string;
  batchDayId?: string;
  batchName: string;
  orderWindowStart?: string;
  orderWindowEnd?: string;
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  status?: string;
  recoveredFromBatchDay: boolean;
};

const formatBatchTime = (value?: string) => {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

export const resolveOrderBatchInfo = (
  order: any,
  batchDays: FoodBatchDay[] = []
): ResolvedBatchInfo | null => {
  if (order?.deliveryType !== 'BATCH' && !order?.foodBatchId && !order?.foodBatchDayId) {
    return null;
  }

  const reference = order.paymentReference || order.id;
  const batchDay = batchDays.find((day) => (
    (order.foodBatchDayId && day.id === order.foodBatchDayId) ||
    (order.foodBatchId && day.batchId === order.foodBatchId) ||
    day.pendingReservations?.some((reservation) => reservation.reference === reference)
  ));

  return {
    batchId: order.foodBatchId || batchDay?.batchId,
    batchDayId: order.foodBatchDayId || batchDay?.id,
    batchName: order.foodBatchName || batchDay?.batchName || 'Scheduled Batch',
    orderWindowStart: order.orderWindowStart || batchDay?.orderWindowStart,
    orderWindowEnd: order.orderWindowEnd || batchDay?.orderWindowEnd,
    deliveryWindowStart: order.deliveryWindowStart || batchDay?.deliveryWindowStart,
    deliveryWindowEnd: order.deliveryWindowEnd || batchDay?.deliveryWindowEnd,
    status: batchDay?.status,
    recoveredFromBatchDay: Boolean(batchDay && !order.foodBatchName),
  };
};

export function BatchOrderInfo({
  order,
  batchDays = [],
  compact = false,
  className = '',
}: BatchOrderInfoProps) {
  const batch = resolveOrderBatchInfo(order, batchDays);
  if (!batch) return null;

  const deliveryWindow = batch.deliveryWindowStart && batch.deliveryWindowEnd
    ? `${formatBatchTime(batch.deliveryWindowStart)} - ${formatBatchTime(batch.deliveryWindowEnd)}`
    : 'Delivery window unavailable';
  const orderWindow = batch.orderWindowStart && batch.orderWindowEnd
    ? `${formatBatchTime(batch.orderWindowStart)} - ${formatBatchTime(batch.orderWindowEnd)}`
    : null;

  if (compact) {
    return (
      <div className={`mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-[#7C3AED] ${className}`}>
        <span className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          {batch.batchName}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Delivery {deliveryWindow}
        </span>
      </div>
    );
  }

  return (
    <div className={`border border-[#7C3AED]/25 bg-[#7C3AED]/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
          <Package className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7C3AED]">
            Scheduled delivery batch
          </p>
          <p className="mt-1 text-base font-black text-foreground">{batch.batchName}</p>
          <div className="mt-2 space-y-1 text-xs font-semibold text-muted-foreground">
            {orderWindow && <p>Ordering window: {orderWindow}</p>}
            <p>Delivery window: {deliveryWindow}</p>
            {(batch.batchDayId || batch.batchId) && (
              <p className="font-mono text-[10px]">
                Batch reference: {batch.batchDayId || batch.batchId}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
