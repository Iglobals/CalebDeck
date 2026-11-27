import { getLagosDateParts } from '../src/services/foodSchedule.js';
import type { OrderVertical } from '../src/services/orderVertical.js';

export interface ServiceGuardResult {
  allowed: boolean;
  httpStatus?: number;
  code?: string;
  message?: string;
  settings?: Record<string, any>;
}

/**
 * Server-side enforcement for discontinued CalebDeck services (Food Delivery & Mart).
 *
 * - FOOD -> HTTP 410 FOOD_DISCONTINUED
 * - MART -> HTTP 410 MART_DISCONTINUED
 * - FASHION -> Allowed (active product)
 *
 * Historical records in Firestore remain untouched and readable.
 */
export async function validateServiceAndSchedule(
  _db: FirebaseFirestore.Firestore,
  options: {
    vertical: OrderVertical;
    scheduledDateStr?: string | null;
    now?: Date;
  }
): Promise<ServiceGuardResult> {
  const { vertical } = options;

  if (vertical === 'MART') {
    return {
      allowed: false,
      httpStatus: 410,
      code: 'MART_DISCONTINUED',
      message:
        'Thank you for being part of our journey. CalebDeck Mart has been discontinued as CalebDeck transitions into its next chapter. Explore our active offerings on CalebDeck Fashion.',
    };
  }

  if (vertical === 'FOOD') {
    return {
      allowed: false,
      httpStatus: 410,
      code: 'FOOD_DISCONTINUED',
      message:
        'Thank you for being part of our journey. CalebDeck Food Delivery has been discontinued as CalebDeck transitions into its next chapter. Explore our active offerings on CalebDeck Fashion.',
    };
  }

  return {
    allowed: true,
  };
}

export { getLagosDateParts };
