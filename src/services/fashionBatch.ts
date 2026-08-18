/**
 * CalebDeck — Fashion Batch Schedule Utilities
 *
 * Pure functions for the weekly fashion batch ordering cycle.
 * No Firebase imports — safe for use on client AND server.
 *
 * TIMEZONE: All calculations use browser-local time (WAT / UTC+1 for Nigeria).
 * The existing food batch system follows the same pattern — every time boundary
 * in CalebDeck is evaluated against the student's local clock.
 *
 * Weekly cycle (defaults):
 *   Monday → Thursday 5pm : order window open
 *   Thursday 5pm           : batch closes
 *   Friday                 : shipment arrives at Caleb University
 *   Friday → Saturday      : customer delivery
 */

// ─── Types ───

export interface FashionBatchConfig {
  /** Day the order window opens (1 = Monday, 7 = Sunday) */
  orderWindowOpenDay: number;
  /** Day the order window closes (1 = Monday, 7 = Sunday) */
  orderWindowCloseDay: number;
  /** Hour (0–23) when the window closes on closeDay */
  orderWindowCloseHour: number;
  /** Day shipment arrives at campus */
  arrivalDay: number;
  /** First day of customer delivery */
  deliveryStartDay: number;
  /** Last day of customer delivery */
  deliveryEndDay: number;
}

export interface FashionBatchState {
  /** Whether the order window is currently open */
  isOpen: boolean;
  /** Whether we're within the grace period after close (checkout still allowed) */
  isGracePeriod: boolean;
  /** Human label: "Week of Aug 18" */
  currentBatchLabel: string;
  /** Exact Date when the current/next window closes */
  nextCloseDate: Date;
  /** Exact Date when the next window opens (only relevant when closed) */
  nextOpenDate: Date;
  /** Countdown components (no seconds — spec requirement) */
  daysUntilClose: number;
  hoursUntilClose: number;
  minutesUntilClose: number;
  /** Expected delivery date (Friday of this or next cycle) */
  expectedArrivalDate: Date;
  /** Whether we're in the "closing soon" window (last 24h before close) */
  isClosingSoon: boolean;
}

// ─── Defaults ───

export const DEFAULT_FASHION_BATCH_CONFIG: FashionBatchConfig = {
  orderWindowOpenDay: 1,    // Monday
  orderWindowCloseDay: 4,   // Thursday
  orderWindowCloseHour: 17, // 5:00 PM
  arrivalDay: 5,            // Friday
  deliveryStartDay: 5,      // Friday
  deliveryEndDay: 6,        // Saturday
};

/** Grace period: 5 minutes after batch close, checkout still allowed */
const GRACE_PERIOD_MS = 5 * 60 * 1000;

/** "Closing soon" threshold: last 24 hours of the order window */
const CLOSING_SOON_MS = 24 * 60 * 60 * 1000;

// ─── Day Helpers ───

/**
 * Convert JS Date.getDay() (0=Sun) to ISO weekday (1=Mon, 7=Sun).
 */
function jsToIsoDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Get the next occurrence of a specific ISO weekday at a given hour,
 * relative to `from`. If `from` is already on that day and before that hour,
 * returns today at that hour.
 */
function nextOccurrence(isoDow: number, hour: number, from: Date): Date {
  const currentIsoDow = jsToIsoDow(from.getDay());
  let daysAhead = isoDow - currentIsoDow;

  if (daysAhead < 0) {
    daysAhead += 7;
  } else if (daysAhead === 0) {
    // Same day — check if the hour has passed
    if (from.getHours() >= hour) {
      daysAhead = 7; // Next week
    }
  }

  const result = new Date(from);
  result.setDate(result.getDate() + daysAhead);
  result.setHours(hour, 0, 0, 0);
  return result;
}

/**
 * Get the most recent past occurrence of a specific ISO weekday at a given hour.
 */
function previousOccurrence(isoDow: number, hour: number, from: Date): Date {
  const currentIsoDow = jsToIsoDow(from.getDay());
  let daysBack = currentIsoDow - isoDow;

  if (daysBack < 0) {
    daysBack += 7;
  } else if (daysBack === 0) {
    if (from.getHours() < hour) {
      daysBack = 7; // Last week's occurrence
    }
  }

  const result = new Date(from);
  result.setDate(result.getDate() - daysBack);
  result.setHours(hour, 0, 0, 0);
  return result;
}

// ─── Core Logic ───

/**
 * Compute the full batch state for the current moment.
 *
 * @param config  Batch configuration (days/hours). Falls back to defaults.
 * @param now     Current time — defaults to `new Date()` (browser-local / WAT).
 */
export function getFashionBatchState(
  config: FashionBatchConfig = DEFAULT_FASHION_BATCH_CONFIG,
  now: Date = new Date()
): FashionBatchState {
  const { orderWindowOpenDay, orderWindowCloseDay, orderWindowCloseHour, arrivalDay } = config;

  // When does/did this cycle's window close?
  const closeThisCycle = nextOccurrence(orderWindowCloseDay, orderWindowCloseHour, now);
  const closePrevCycle = previousOccurrence(orderWindowCloseDay, orderWindowCloseHour, now);

  // When does/did this cycle's window open?
  const openThisCycle = nextOccurrence(orderWindowOpenDay, 0, now);
  const openPrevCycle = previousOccurrence(orderWindowOpenDay, 0, now);

  // Determine if the window is currently open.
  // Open = we're between openPrevCycle and closeThisCycle (same cycle)
  // The close must be AFTER the open for them to be the same cycle.
  const isOpenBySchedule =
    openPrevCycle.getTime() <= now.getTime() &&
    now.getTime() < closeThisCycle.getTime() &&
    closeThisCycle.getTime() > openPrevCycle.getTime();

  // Grace period: up to 5 minutes after close
  const msSinceClose = now.getTime() - closePrevCycle.getTime();
  const isGracePeriod = !isOpenBySchedule && msSinceClose > 0 && msSinceClose <= GRACE_PERIOD_MS;

  const isOpen = isOpenBySchedule;

  // Countdown to close (only meaningful when open)
  const msUntilClose = isOpen ? closeThisCycle.getTime() - now.getTime() : 0;
  const totalMinutes = Math.floor(msUntilClose / 60000);
  const daysUntilClose = Math.floor(totalMinutes / 1440);
  const hoursUntilClose = Math.floor((totalMinutes % 1440) / 60);
  const minutesUntilClose = totalMinutes % 60;

  // Closing soon = within last 24h of order window
  const isClosingSoon = isOpen && msUntilClose <= CLOSING_SOON_MS;

  // Next open date (when closed)
  const nextOpenDate = isOpen ? openThisCycle : nextOccurrence(orderWindowOpenDay, 0, now);

  // Expected arrival date: the Friday following the close
  const expectedArrivalDate = getExpectedDeliveryDate(config, now);

  // Batch label: "Week of Aug 18"
  const mondayOfBatch = isOpen ? openPrevCycle : nextOpenDate;
  const currentBatchLabel = `Week of ${mondayOfBatch.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return {
    isOpen,
    isGracePeriod,
    currentBatchLabel,
    nextCloseDate: isOpen ? closeThisCycle : nextOccurrence(orderWindowCloseDay, orderWindowCloseHour, nextOpenDate),
    nextOpenDate,
    daysUntilClose,
    hoursUntilClose,
    minutesUntilClose,
    expectedArrivalDate,
    isClosingSoon,
  };
}

/**
 * Compute the expected delivery (arrival) date for orders placed now.
 * Returns the Friday following the current batch close.
 */
export function getExpectedDeliveryDate(
  config: FashionBatchConfig = DEFAULT_FASHION_BATCH_CONFIG,
  now: Date = new Date()
): Date {
  const { orderWindowCloseDay, orderWindowCloseHour, arrivalDay } = config;

  // Find the close date for the batch this order belongs to
  const closeDate = nextOccurrence(orderWindowCloseDay, orderWindowCloseHour, now);

  // If we're past close (batch is closed), orders go to next cycle
  const effectiveClose = now.getTime() >= closeDate.getTime()
    ? nextOccurrence(orderWindowCloseDay, orderWindowCloseHour, new Date(now.getTime() + 1))
    : closeDate;

  // Arrival is the next arrivalDay after the effective close
  return nextOccurrence(arrivalDay, 10, effectiveClose); // 10am Friday arrival
}

/**
 * Format the countdown for display.
 * Returns "2d 14h 30m" — no seconds, no pressure.
 */
export function formatFashionCountdown(state: FashionBatchState): string {
  if (!state.isOpen) return '';
  const parts: string[] = [];
  if (state.daysUntilClose > 0) parts.push(`${state.daysUntilClose}d`);
  if (state.hoursUntilClose > 0 || state.daysUntilClose > 0) parts.push(`${state.hoursUntilClose}h`);
  parts.push(`${state.minutesUntilClose}m`);
  return parts.join(' ');
}

/**
 * Check if a checkout should be allowed right now.
 * True if the batch is open OR within the grace period.
 */
export function isFashionCheckoutAllowed(
  config: FashionBatchConfig = DEFAULT_FASHION_BATCH_CONFIG,
  now: Date = new Date()
): boolean {
  const state = getFashionBatchState(config, now);
  return state.isOpen || state.isGracePeriod;
}

/**
 * Format the expected arrival as a short date string.
 * E.g. "Fri, Aug 22"
 */
export function formatArrivalDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
