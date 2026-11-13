/**
 * CalebDeck — Food Delivery Operating Schedule Utilities
 *
 * Pure, timezone-aware helpers for checking and formatting admin-configurable
 * food delivery operating days in Africa/Lagos (WAT, UTC+1).
 *
 * No Firebase imports — safe for both client and serverless backend use.
 */

export type WeekdayNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const FOOD_DELIVERY_TIMEZONE = 'Africa/Lagos';

/** Initial operational schedule: Fridays, Saturdays, and Sundays */
export const DEFAULT_FOOD_OPERATING_DAYS: WeekdayNumber[] = [5, 6, 0];

export interface WeekdayOption {
  day: WeekdayNumber;
  label: string;
  shortLabel: string;
}

/** Display order Monday -> Sunday for Admin UI & formatting */
export const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { day: 1, label: 'Monday', shortLabel: 'Mon' },
  { day: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { day: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { day: 4, label: 'Thursday', shortLabel: 'Thu' },
  { day: 5, label: 'Friday', shortLabel: 'Fri' },
  { day: 6, label: 'Saturday', shortLabel: 'Sat' },
  { day: 0, label: 'Sunday', shortLabel: 'Sun' },
];

const SHORT_WEEKDAY_TO_NUM: Record<string, WeekdayNumber> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const WEEKDAY_LABEL_MAP: Record<WeekdayNumber, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const CANONICAL_ORDER: Record<WeekdayNumber, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  0: 6,
};

export interface LagosDateParts {
  weekday: WeekdayNumber;
  weekdayName: string;
  dateStr: string; // YYYY-MM-DD in Africa/Lagos
  hour: number;
  minute: number;
  minutesSinceMidnight: number;
}

/**
 * Extract date/time parts in Africa/Lagos timezone regardless of device or server local TZ.
 */
export function getLagosDateParts(now: Date = new Date()): LagosDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: FOOD_DELIVERY_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const weekday = SHORT_WEEKDAY_TO_NUM[map.weekday] ?? (now.getUTCDay() as WeekdayNumber);
  const rawHour = Number(map.hour ?? 0);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(map.minute ?? 0);
  const year = map.year || String(now.getUTCFullYear());
  const month = map.month || String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = map.day || String(now.getUTCDate()).padStart(2, '0');

  return {
    weekday,
    weekdayName: WEEKDAY_LABEL_MAP[weekday],
    dateStr: `${year}-${month}-${day}`,
    hour,
    minute,
    minutesSinceMidnight: hour * 60 + minute,
  };
}

/**
 * Normalize operating days from Firestore or client state.
 * - `undefined` or `null` -> defaults to `[5, 6, 0]` (Fri, Sat, Sun)
 * - Explicit array (including `[]` when admin disables all days) -> deduplicated & sorted Mon..Sun
 */
export function normalizeFoodOperatingDays(days?: unknown): WeekdayNumber[] {
  if (days === undefined || days === null) {
    return [...DEFAULT_FOOD_OPERATING_DAYS];
  }
  if (!Array.isArray(days)) {
    return [...DEFAULT_FOOD_OPERATING_DAYS];
  }

  const unique = new Set<WeekdayNumber>();
  for (const d of days) {
    const num = Number(d);
    if (Number.isInteger(num) && num >= 0 && num <= 6) {
      unique.add(num as WeekdayNumber);
    }
  }

  return Array.from(unique).sort((a, b) => CANONICAL_ORDER[a] - CANONICAL_ORDER[b]);
}

/**
 * Validate admin input when saving foodOperatingDays.
 */
export function validateFoodOperatingDaysInput(
  days: unknown
): { valid: true; days: WeekdayNumber[] } | { valid: false; message: string } {
  if (!Array.isArray(days)) {
    return { valid: false, message: 'Operating days must be an array of weekday numbers (0-6).' };
  }

  const unique = new Set<WeekdayNumber>();
  for (const item of days) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item < 0 || item > 6) {
      return { valid: false, message: `Invalid weekday value "${String(item)}". Expected integers 0 (Sun) through 6 (Sat).` };
    }
    unique.add(item as WeekdayNumber);
  }

  return {
    valid: true,
    days: Array.from(unique).sort((a, b) => CANONICAL_ORDER[a] - CANONICAL_ORDER[b]),
  };
}

/**
 * True if `now` (in Africa/Lagos) falls on an enabled food operating day.
 */
export function isFoodOperatingDay(operatingDays?: unknown, now: Date = new Date()): boolean {
  const normalized = normalizeFoodOperatingDays(operatingDays);
  if (normalized.length === 0) return false;
  const { weekday } = getLagosDateParts(now);
  return normalized.includes(weekday);
}

/**
 * True if a YYYY-MM-DD calendar date falls on an enabled food operating day.
 */
export function isDateStrFoodOperatingDay(dateStr: string, operatingDays?: unknown): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const normalized = normalizeFoodOperatingDays(operatingDays);
  if (normalized.length === 0) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  // Noon UTC avoids any midnight timezone boundary shift
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const { weekday } = getLagosDateParts(probe);
  return normalized.includes(weekday);
}

/**
 * Format operating days into a clear human-readable schedule label.
 * Examples:
 * - [5, 6, 0] -> "Fridays, Saturdays & Sundays"
 * - [1, 2, 3, 4, 5, 6, 0] -> "Every day (Monday – Sunday)"
 * - [] -> "Temporarily suspended (No operating days)"
 */
export function formatFoodOperatingDays(operatingDays?: unknown): string {
  const normalized = normalizeFoodOperatingDays(operatingDays);
  if (normalized.length === 0) {
    return 'Temporarily suspended (No operating days)';
  }
  if (normalized.length === 7) {
    return 'Every day (Monday – Sunday)';
  }

  const pluralNames = normalized.map((d) => `${WEEKDAY_LABEL_MAP[d]}s`);
  if (pluralNames.length === 1) {
    return `${pluralNames[0]} only`;
  }
  if (pluralNames.length === 2) {
    return `${pluralNames[0]} & ${pluralNames[1]}`;
  }
  return `${pluralNames.slice(0, -1).join(', ')} & ${pluralNames[pluralNames.length - 1]}`;
}

export interface NextOperatingDayInfo {
  weekday: WeekdayNumber;
  label: string;
  dateStr: string;
  daysAhead: number;
}

/**
 * Find the next enabled food operating day starting tomorrow (up to 7 days ahead) in Africa/Lagos.
 */
export function getNextFoodOperatingDay(
  operatingDays?: unknown,
  now: Date = new Date()
): NextOperatingDayInfo | null {
  const normalized = normalizeFoodOperatingDays(operatingDays);
  if (normalized.length === 0) return null;

  for (let offset = 1; offset <= 7; offset += 1) {
    const probe = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const parts = getLagosDateParts(probe);
    if (normalized.includes(parts.weekday)) {
      return {
        weekday: parts.weekday,
        label: parts.weekdayName,
        dateStr: parts.dateStr,
        daysAhead: offset,
      };
    }
  }
  return null;
}

export type FoodAvailabilityReason =
  | 'OK'
  | 'GLOBAL_CLOSED'
  | 'FOOD_CLOSED'
  | 'ALL_DAYS_DISABLED'
  | 'OUTSIDE_OPERATING_DAYS';

export interface FoodDeliveryAvailability {
  isAvailable: boolean;
  reason: FoodAvailabilityReason;
  operatingDays: WeekdayNumber[];
  scheduleLabel: string;
  currentDayName: string;
  currentDateStr: string;
  nextOperatingDay: NextOperatingDayInfo | null;
  userMessage: string;
}

export interface FoodAvailabilitySettingsInput {
  foodOperatingDays?: unknown;
  isAcceptingOrders?: boolean;
  isFoodOrderingClosed?: boolean;
  globalClosedMessage?: string;
  foodOrderingClosedMessage?: string;
}

/**
 * Single source of truth for evaluating whether food delivery is currently open
 * based on platform status + admin-configured operating days in Africa/Lagos.
 */
export function getFoodDeliveryAvailability(
  settings?: FoodAvailabilitySettingsInput | null,
  now: Date = new Date()
): FoodDeliveryAvailability {
  const operatingDays = normalizeFoodOperatingDays(settings?.foodOperatingDays);
  const scheduleLabel = formatFoodOperatingDays(operatingDays);
  const { weekday, weekdayName, dateStr } = getLagosDateParts(now);
  const nextOperatingDay = getNextFoodOperatingDay(operatingDays, now);

  if (settings?.isAcceptingOrders === false) {
    return {
      isAvailable: false,
      reason: 'GLOBAL_CLOSED',
      operatingDays,
      scheduleLabel,
      currentDayName: weekdayName,
      currentDateStr: dateStr,
      nextOperatingDay,
      userMessage: settings.globalClosedMessage || 'CalebDeck is currently paused for maintenance.',
    };
  }

  if (settings?.isFoodOrderingClosed === true) {
    return {
      isAvailable: false,
      reason: 'FOOD_CLOSED',
      operatingDays,
      scheduleLabel,
      currentDayName: weekdayName,
      currentDateStr: dateStr,
      nextOperatingDay,
      userMessage: settings.foodOrderingClosedMessage || 'Food ordering is temporarily closed right now.',
    };
  }

  if (operatingDays.length === 0) {
    return {
      isAvailable: false,
      reason: 'ALL_DAYS_DISABLED',
      operatingDays,
      scheduleLabel,
      currentDayName: weekdayName,
      currentDateStr: dateStr,
      nextOperatingDay: null,
      userMessage: 'Food delivery is temporarily suspended across all days. Please check back later.',
    };
  }

  if (!operatingDays.includes(weekday)) {
    const reopenHint = nextOperatingDay
      ? ` Ordering reopens ${nextOperatingDay.daysAhead === 1 ? 'tomorrow' : `on ${nextOperatingDay.label}`}.`
      : '';
    return {
      isAvailable: false,
      reason: 'OUTSIDE_OPERATING_DAYS',
      operatingDays,
      scheduleLabel,
      currentDayName: weekdayName,
      currentDateStr: dateStr,
      nextOperatingDay,
      userMessage: `Food delivery operates on ${scheduleLabel}. Today is ${weekdayName}.${reopenHint}`,
    };
  }

  return {
    isAvailable: true,
    reason: 'OK',
    operatingDays,
    scheduleLabel,
    currentDayName: weekdayName,
    currentDateStr: dateStr,
    nextOperatingDay,
    userMessage: `Food delivery is open today (${weekdayName}). Operating days: ${scheduleLabel}.`,
  };
}
