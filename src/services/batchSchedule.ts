/**
 * CalebDeck — Batch Schedule Utilities
 *
 * Pure functions for resolving active/next delivery batches,
 * computing countdowns, and formatting time displays.
 * No Firebase imports — safe for use on client AND server.
 */

// ─── Types ───

export interface FoodBatchSchedule {
  id: string;
  batchName: string;
  orderWindowStart: string;   // "06:00" HH:mm
  orderWindowEnd: string;     // "09:00"
  deliveryWindowStart: string; // "10:00"
  deliveryWindowEnd: string;   // "11:30"
  maxOrdersPerBatch: number;
  isActive: boolean;
}

export interface FoodBatchDay {
  id?: string;
  date: string;                // "2026-05-20"
  batchId: string;
  batchName: string;
  orderWindowStart: string;
  orderWindowEnd: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  confirmedOrders: number;
  reservedSlots: number;
  maxOrders: number;
  status: 'OPEN' | 'CLOSED' | 'FULL' | 'PREPARING' | 'DISPATCHING' | 'DELIVERING' | 'COMPLETED';
  revenue: number;
  hostelCounts: Record<string, number>;
  cafeteriaCounts: Record<string, number>;
  pendingReservations: Array<{ reference: string; reservedAt: number }>;
}

// ─── Time Helpers ───

/** Parse "HH:mm" into total minutes since midnight */
function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Get total minutes since midnight from a Date */
function getMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Create a Date for today at a given "HH:mm" time string */
function todayAt(timeStr: string, referenceDate: Date): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(referenceDate);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** Format "HH:mm" (24hr) to human-readable like "2:30pm" */
export function formatBatchTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? 'pm' : 'am';
  const minuteStr = (m || 0).toString().padStart(2, '0');
  return minuteStr === '00' ? `${hour12}${ampm}` : `${hour12}:${minuteStr}${ampm}`;
}

// ─── Core Logic ───

/**
 * Sort schedules by orderWindowStart time.
 * Only returns active schedules.
 */
export function getActiveSchedules(schedules: FoodBatchSchedule[]): FoodBatchSchedule[] {
  return schedules
    .filter(s => s.isActive)
    .sort((a, b) => parseTimeToMinutes(a.orderWindowStart) - parseTimeToMinutes(b.orderWindowStart));
}

/**
 * Find the batch whose order window is currently active.
 * Returns null if no window is open.
 */
export function getActiveBatch(
  schedules: FoodBatchSchedule[],
  now: Date = new Date()
): FoodBatchSchedule | null {
  const minutes = getMinutesSinceMidnight(now);
  const active = getActiveSchedules(schedules);
  return active.find(s => {
    const start = parseTimeToMinutes(s.orderWindowStart);
    const end = parseTimeToMinutes(s.orderWindowEnd);
    return minutes >= start && minutes < end;
  }) || null;
}

/**
 * Find the next upcoming batch after the current time.
 * If no future batch today, returns the first batch (wraps to tomorrow).
 */
export function getNextBatch(
  schedules: FoodBatchSchedule[],
  now: Date = new Date()
): FoodBatchSchedule | null {
  const minutes = getMinutesSinceMidnight(now);
  const active = getActiveSchedules(schedules);
  if (active.length === 0) return null;

  // Find next batch whose order window hasn't started yet
  const upcoming = active.find(s => parseTimeToMinutes(s.orderWindowStart) > minutes);
  // If none today, wrap to first batch (tomorrow)
  return upcoming || active[0];
}

/**
 * Check if a specific batch window is currently open.
 */
export function isBatchOpen(batch: FoodBatchSchedule, now: Date = new Date()): boolean {
  const minutes = getMinutesSinceMidnight(now);
  const start = parseTimeToMinutes(batch.orderWindowStart);
  const end = parseTimeToMinutes(batch.orderWindowEnd);
  return minutes >= start && minutes < end;
}

/**
 * Check if the current time is within the grace period after a batch closes.
 * Used to allow payment completion for students who entered checkout before close.
 */
export function isWithinGracePeriod(
  batch: FoodBatchSchedule,
  now: Date = new Date(),
  graceMs: number = 5 * 60 * 1000 // 5 minutes
): boolean {
  const closeTime = todayAt(batch.orderWindowEnd, now);
  const diff = now.getTime() - closeTime.getTime();
  // Must be AFTER close and within grace window
  return diff > 0 && diff <= graceMs;
}

/**
 * Milliseconds remaining until the current active batch's order window closes.
 * Returns 0 if no batch is active.
 */
export function getTimeUntilClose(batch: FoodBatchSchedule, now: Date = new Date()): number {
  const closeTime = todayAt(batch.orderWindowEnd, now);
  const diff = closeTime.getTime() - now.getTime();
  return Math.max(0, diff);
}

/**
 * Milliseconds until the next batch's order window opens.
 * Handles wrap-around to tomorrow's first batch.
 */
export function getTimeUntilNextOpen(
  schedules: FoodBatchSchedule[],
  now: Date = new Date()
): number {
  const next = getNextBatch(schedules, now);
  if (!next) return 0;

  const openTime = todayAt(next.orderWindowStart, now);
  let diff = openTime.getTime() - now.getTime();

  // If the next batch is actually tomorrow (wrap-around), add 24h
  if (diff <= 0) {
    diff += 24 * 60 * 60 * 1000;
  }

  return Math.max(0, diff);
}

/**
 * Check if a batch is at capacity.
 * Uses confirmed + reserved slots vs max orders.
 */
export function isBatchFull(batchDay: FoodBatchDay | null): boolean {
  if (!batchDay) return false;
  return (batchDay.confirmedOrders + batchDay.reservedSlots) >= batchDay.maxOrders;
}

/**
 * Get fill percentage (0–100) for a batch.
 */
export function getBatchFillPercent(batchDay: FoodBatchDay | null): number {
  if (!batchDay || batchDay.maxOrders <= 0) return 0;
  return Math.min(100, Math.round(((batchDay.confirmedOrders + batchDay.reservedSlots) / batchDay.maxOrders) * 100));
}

/**
 * Generate the Firestore document ID for a batch day.
 * Format: "2026-05-20_lunch"
 */
export function getBatchDayId(batchId: string, date: Date = new Date()): string {
  const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
  return `${dateStr}_${batchId}`;
}

/**
 * Format milliseconds into a clean countdown string.
 * Returns "02:15:08" for hours, "42:11" for minutes-only, "0:05" for seconds-only.
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get the default 3 batch schedules for CalebDeck.
 */
export function getDefaultSchedules(): FoodBatchSchedule[] {
  return [
    {
      id: 'breakfast',
      batchName: 'Breakfast Batch',
      orderWindowStart: '06:00',
      orderWindowEnd: '09:00',
      deliveryWindowStart: '10:00',
      deliveryWindowEnd: '11:30',
      maxOrdersPerBatch: 50,
      isActive: true,
    },
    {
      id: 'lunch',
      batchName: 'Lunch Batch',
      orderWindowStart: '11:30',
      orderWindowEnd: '13:30',
      deliveryWindowStart: '14:30',
      deliveryWindowEnd: '16:00',
      maxOrdersPerBatch: 72,
      isActive: true,
    },
    {
      id: 'dinner',
      batchName: 'Dinner Batch',
      orderWindowStart: '16:00',
      orderWindowEnd: '17:30',
      deliveryWindowStart: '18:30',
      deliveryWindowEnd: '20:00',
      maxOrdersPerBatch: 60,
      isActive: true,
    },
  ];
}

/**
 * Create a default empty FoodBatchDay document payload.
 */
export function createEmptyBatchDay(
  schedule: FoodBatchSchedule,
  date: Date = new Date()
): Omit<FoodBatchDay, 'id'> {
  return {
    date: date.toLocaleDateString('en-CA'),
    batchId: schedule.id,
    batchName: schedule.batchName,
    orderWindowStart: schedule.orderWindowStart,
    orderWindowEnd: schedule.orderWindowEnd,
    deliveryWindowStart: schedule.deliveryWindowStart,
    deliveryWindowEnd: schedule.deliveryWindowEnd,
    confirmedOrders: 0,
    reservedSlots: 0,
    maxOrders: schedule.maxOrdersPerBatch,
    status: 'OPEN',
    revenue: 0,
    hostelCounts: {},
    cafeteriaCounts: {},
    pendingReservations: [],
  };
}
