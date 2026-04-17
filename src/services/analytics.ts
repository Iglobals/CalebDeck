import { logEvent } from "firebase/analytics";
import { analytics } from "./firebase";

/**
 * Comprehensive analytics service for CalebDeck
 * Tracks user behavior, conversions, and key interactions
 */

// ==================== PAGE ANALYTICS ====================
export const trackPageView = (pageName: string, pagePath: string) => {
  logEvent(analytics, 'page_view', {
    page_title: pageName,
    page_path: pagePath,
    timestamp: new Date().toISOString(),
  });
};

// ==================== STUDENT FLOW ANALYTICS ====================

export const trackLandingPageView = () => {
  trackPageView('Landing Page', '/');
};

export const trackCafeteriaSelectionView = () => {
  trackPageView('Cafeteria Selection', '/cafeteria');
};

export const trackPlateBuilderView = (cafeteriaId: string, cafeteriaName: string) => {
  logEvent(analytics, 'plate_builder_viewed', {
    cafeteria_id: cafeteriaId,
    cafeteria_name: cafeteriaName,
    timestamp: new Date().toISOString(),
  });
};

export const trackItemAdded = (
  itemId: string,
  itemName: string,
  price: number,
  cafeteriaId: string,
  quantity: number = 1
) => {
  logEvent(analytics, 'item_added_to_cart', {
    item_id: itemId,
    item_name: itemName,
    item_price: price,
    cafeteria_id: cafeteriaId,
    quantity: quantity,
    timestamp: new Date().toISOString(),
  });
};

export const trackPlateAdded = (
  plateType: 'main' | 'swallow',
  itemCount: number,
  totalPrice: number,
  cafeteriaId: string
) => {
  logEvent(analytics, 'plate_created', {
    plate_type: plateType,
    item_count: itemCount,
    total_price: totalPrice,
    cafeteria_id: cafeteriaId,
    timestamp: new Date().toISOString(),
  });
};

export const trackCheckoutView = (
  cartValue: number,
  itemCount: number,
  cafeteriaId: string,
  cafeteriaName: string
) => {
  logEvent(analytics, 'checkout_viewed', {
    cart_value: cartValue,
    item_count: itemCount,
    cafeteria_id: cafeteriaId,
    cafeteria_name: cafeteriaName,
    timestamp: new Date().toISOString(),
  });
};

export const trackDeliveryModeSelected = (deliveryMode: 'solo' | 'group', groupSize?: number) => {
  logEvent(analytics, 'delivery_mode_selected', {
    delivery_mode: deliveryMode,
    group_size: groupSize || 1,
    timestamp: new Date().toISOString(),
  });
};

export const trackPaymentInitiated = (
  totalAmount: number,
  deliveryMode: string,
  paymentMethod: 'paystack' | 'manual' = 'paystack'
) => {
  logEvent(analytics, 'payment_initiated', {
    total_amount: totalAmount,
    delivery_mode: deliveryMode,
    payment_method: paymentMethod,
    timestamp: new Date().toISOString(),
  });
};

export const trackOrderPlaced = (
  orderId: string,
  totalAmount: number,
  itemCount: number,
  cafeteriaId: string,
  cafeteriaName: string,
  deliveryMode: string,
  paymentReference?: string
) => {
  logEvent(analytics, 'order_completed', {
    order_id: orderId,
    total_amount: totalAmount,
    item_count: itemCount,
    cafeteria_id: cafeteriaId,
    cafeteria_name: cafeteriaName,
    delivery_mode: deliveryMode,
    payment_reference: paymentReference || 'unknown',
    timestamp: new Date().toISOString(),
  });
};

export const trackOrderTracked = (orderId: string, status: string) => {
  logEvent(analytics, 'order_tracked', {
    order_id: orderId,
    order_status: status,
    timestamp: new Date().toISOString(),
  });
};

// ==================== ADMIN FLOW ANALYTICS ====================

export const trackAdminLoginAttempt = (email: string, success: boolean) => {
  logEvent(analytics, 'admin_login_attempt', {
    email: email,
    success: success,
    timestamp: new Date().toISOString(),
  });
};

export const trackAdminDashboardView = () => {
  trackPageView('Admin Dashboard', '/admin');
};

export const trackAdminOrdersView = () => {
  trackPageView('Admin Orders', '/admin/orders');
};

export const trackAdminAnalyticsView = () => {
  trackPageView('Admin Analytics', '/admin/analytics');
};

export const trackOrderStatusUpdated = (orderId: string, newStatus: string) => {
  logEvent(analytics, 'order_status_updated', {
    order_id: orderId,
    new_status: newStatus,
    timestamp: new Date().toISOString(),
  });
};

export const trackRiderAssigned = (orderId: string, riderId: string) => {
  logEvent(analytics, 'rider_assigned', {
    order_id: orderId,
    rider_id: riderId,
    timestamp: new Date().toISOString(),
  });
};

// ==================== RIDER FLOW ANALYTICS ====================

export const trackRiderLoginAttempt = (email: string, success: boolean) => {
  logEvent(analytics, 'rider_login_attempt', {
    email: email,
    success: success,
    timestamp: new Date().toISOString(),
  });
};

export const trackRiderSignupAttempt = (email: string, success: boolean) => {
  logEvent(analytics, 'rider_signup_attempt', {
    email: email,
    success: success,
    timestamp: new Date().toISOString(),
  });
};

export const trackRiderDashboardView = () => {
  trackPageView('Rider Dashboard', '/rider');
};

export const trackRiderOrderAccepted = (orderId: string, deliveryLocation: string) => {
  logEvent(analytics, 'rider_accepted_order', {
    order_id: orderId,
    delivery_location: deliveryLocation,
    timestamp: new Date().toISOString(),
  });
};

export const trackRiderOrderCompleted = (orderId: string, completionTime: number) => {
  logEvent(analytics, 'rider_completed_order', {
    order_id: orderId,
    completion_time_minutes: completionTime,
    timestamp: new Date().toISOString(),
  });
};

// ==================== ERROR TRACKING ====================

export const trackError = (errorName: string, errorMessage: string, context?: string) => {
  logEvent(analytics, 'error_occurred', {
    error_name: errorName,
    error_message: errorMessage,
    context: context || 'unknown',
    timestamp: new Date().toISOString(),
  });
};

export const trackPaymentFailed = (totalAmount: number, error: string) => {
  logEvent(analytics, 'payment_failed', {
    total_amount: totalAmount,
    error_reason: error,
    timestamp: new Date().toISOString(),
  });
};

// ==================== ENGAGEMENT TRACKING ====================

export const trackLinkClicked = (linkName: string, destination: string) => {
  logEvent(analytics, 'link_clicked', {
    link_name: linkName,
    destination: destination,
    timestamp: new Date().toISOString(),
  });
};

export const trackPageSection = (sectionName: string, action: string) => {
  logEvent(analytics, 'section_interaction', {
    section_name: sectionName,
    action: action,
    timestamp: new Date().toISOString(),
  });
};

export const trackUserPreference = (preferenceType: string, value: string) => {
  logEvent(analytics, 'user_preference_set', {
    preference_type: preferenceType,
    preference_value: value,
    timestamp: new Date().toISOString(),
  });
};
