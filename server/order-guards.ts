import {
  getFoodDeliveryAvailability,
  isDateStrFoodOperatingDay,
  getLagosDateParts,
  type FoodDeliveryAvailability,
} from '../src/services/foodSchedule.js';
import type { OrderVertical } from '../src/services/orderVertical.js';

export interface ServiceGuardResult {
  allowed: boolean;
  httpStatus?: number;
  code?: string;
  message?: string;
  settings?: Record<string, any>;
  availability?: FoodDeliveryAvailability;
}

/**
 * Server-side enforcement for discontinued services (Mart) and
 * admin-configurable Food Delivery operating days in Africa/Lagos.
 *
 * Accepts an injectable `now` Date for deterministic unit/integration testing.
 */
export async function validateServiceAndSchedule(
  db: FirebaseFirestore.Firestore,
  options: {
    vertical: OrderVertical;
    scheduledDateStr?: string | null;
    now?: Date;
  }
): Promise<ServiceGuardResult> {
  const { vertical, scheduledDateStr, now = new Date() } = options;

  if (vertical === 'MART') {
    return {
      allowed: false,
      httpStatus: 410,
      code: 'MART_DISCONTINUED',
      message: 'CalebDeck Mart has been discontinued and is no longer accepting new orders.',
    };
  }

  if (vertical !== 'FOOD') {
    return { allowed: true };
  }

  const settingsSnap = await db.collection('settings').doc('platform').get();
  const settings = settingsSnap.exists ? (settingsSnap.data() || {}) : {};
  const availability = getFoodDeliveryAvailability(settings, now);

  if (!availability.isAvailable) {
    const code =
      availability.reason === 'OUTSIDE_OPERATING_DAYS' || availability.reason === 'ALL_DAYS_DISABLED'
        ? 'FOOD_OUTSIDE_OPERATING_DAYS'
        : 'FOOD_ORDERING_CLOSED';
    return {
      allowed: false,
      httpStatus: 400,
      code,
      message: availability.userMessage,
      settings,
      availability,
    };
  }

  if (scheduledDateStr && !isDateStrFoodOperatingDay(scheduledDateStr, settings.foodOperatingDays)) {
    return {
      allowed: false,
      httpStatus: 400,
      code: 'FOOD_OUTSIDE_OPERATING_DAYS',
      message: `Scheduled date (${scheduledDateStr}) is not an active food delivery day. Operating days: ${availability.scheduleLabel}.`,
      settings,
      availability,
    };
  }

  return {
    allowed: true,
    settings,
    availability,
  };
}

export { getLagosDateParts };
