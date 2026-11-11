import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { getMessagingInstance, db } from './firebase';
import { doc, setDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

export interface NotificationRequestResult {
    success: boolean;
    permission: NotificationPermission | 'unsupported';
    token?: string | null;
    error?: string;
    needsInstallToHomeScreen?: boolean;
    isBlocked?: boolean;
}

export function isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent || '';
    const platform = (window.navigator as any)?.platform || '';
    const maxTouchPoints = window.navigator.maxTouchPoints || 0;
    return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function isStandalonePWA(): boolean {
    if (typeof window === 'undefined') return false;
    return (window.navigator as any).standalone === true || 
        window.matchMedia('(display-mode: standalone)').matches;
}

export function checkNotificationSupport() {
    if (typeof window === 'undefined') {
        return { supported: false, permission: 'unsupported' as const, isIos: false, isStandalone: false, canPrompt: false };
    }
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    const isIosDevice = isIOS();
    const isStandalone = isStandalonePWA();
    const permission: NotificationPermission | 'unsupported' = supported ? Notification.permission : 'unsupported';
    
    // On iOS, push is only functional if added to Home Screen (PWA)
    const canPrompt = supported && (!isIosDevice || isStandalone) && permission !== 'denied';

    return {
        supported,
        permission,
        isIos: isIosDevice,
        isStandalone,
        canPrompt,
    };
}

export const DEFAULT_VAPID_KEY = 'BBonlp_UU5DKw0-wD57O3ocIdQE9alzmXev_fYaWqiGk9KFXwV3ayczXV0s1-QYQOxgOgdba_JjNC7Yu1EJSuNg';

/**
 * Explicitly register the Firebase messaging service worker FIRST,
 * then pass its registration to getToken().
 */
const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | undefined> => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
    try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
        });
        // Race ready with a short timeout so registration doesn't hang in restricted contexts
        await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
        return registration;
    } catch (err) {
        console.warn('Service worker registration failed:', err);
        return undefined;
    }
};

const acquireFCMToken = async (
    messaging: Messaging, 
    swRegistration?: ServiceWorkerRegistration, 
    retries = 3
): Promise<string | null> => {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || DEFAULT_VAPID_KEY;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const tokenOptions: any = {
                vapidKey,
            };
            if (swRegistration) {
                tokenOptions.serviceWorkerRegistration = swRegistration;
            }
            const token = await getToken(messaging, tokenOptions);
            if (token) {
                console.log(`FCM token acquired on attempt ${attempt + 1}`);
                return token;
            }
        } catch (err) {
            console.warn(`FCM token attempt ${attempt + 1} failed:`, err);
            if (attempt < retries - 1) {
                await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            }
        }
    }
    return null;
};

/**
 * Request notification permission and save FCM token to Firestore.
 * targetCollection: 'users' for admins/students, 'riders' for riders
 */
export const requestNotificationPermissionAndSaveToken = async (
    userId: string, 
    targetCollection: 'users' | 'riders'
): Promise<NotificationRequestResult> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return {
            success: false,
            permission: 'unsupported',
            error: 'Push notifications are not supported by this browser.',
        };
    }

    const isIosDevice = isIOS();
    const isStandalone = isStandalonePWA();

    // iOS requires the app to be added to Home Screen as a PWA for Web Push
    if (isIosDevice && !isStandalone) {
        return {
            success: false,
            permission: Notification.permission,
            needsInstallToHomeScreen: true,
            error: 'On iPhone, push notifications require adding CalebDeck to your Home Screen first.',
        };
    }

    if (Notification.permission === 'denied') {
        return {
            success: false,
            permission: 'denied',
            isBlocked: true,
            error: 'Notification permission is blocked. Open iPhone Settings > Notifications > CalebDeck to allow.',
        };
    }

    // CRITICAL FOR SAFARI/iOS: Request permission synchronously inside user gesture before any await
    let permission: NotificationPermission = Notification.permission;
    try {
        if (permission === 'default') {
            permission = await new Promise<NotificationPermission>((resolve) => {
                try {
                    const result = Notification.requestPermission((p) => resolve(p));
                    if (result && typeof result.then === 'function') {
                        result.then(resolve).catch(() => resolve(Notification.permission));
                    }
                } catch {
                    resolve(Notification.permission);
                }
            });
        }
    } catch (err: any) {
        console.warn('Failed to request notification permission:', err);
        return {
            success: false,
            permission: Notification.permission,
            error: err.message || 'Permission request failed.',
        };
    }

    if (permission !== 'granted') {
        return {
            success: false,
            permission,
            isBlocked: permission === 'denied',
            error: permission === 'denied' 
                ? 'Notifications were denied. Allow notifications in your device settings to receive alerts.'
                : 'Notification permission was not granted.',
        };
    }

    try {
        // Step 1: Register the SW
        const swRegistration = await getServiceWorkerRegistration();

        // Step 2: Initialize Firebase Messaging
        const messaging = await getMessagingInstance();
        if (!messaging) {
            return {
                success: false,
                permission: 'granted',
                error: 'Firebase Messaging could not be initialized on this device.',
            };
        }

        // Step 3: Get FCM token
        const token = await acquireFCMToken(messaging, swRegistration);
        if (!token) {
            return {
                success: false,
                permission: 'granted',
                error: 'Could not obtain FCM token from notification service. Please try again.',
            };
        }

        // Remember active token locally
        try {
            localStorage.setItem('calebdeck_fcm_token', token);
        } catch {}

        // Step 4: Save token to Firestore
        try {
            const userRef = doc(db, targetCollection, userId);
            await setDoc(userRef, { 
                fcmTokens: arrayUnion(token),
                notificationsEnabled: true,
                lastTokenUpdatedAt: Date.now()
            }, { merge: true });
            console.log(`FCM token successfully registered for ${targetCollection}/${userId}`);
        } catch (err) {
            console.error('Error saving FCM token to Firestore:', err);
        }

        return {
            success: true,
            permission: 'granted',
            token,
        };
    } catch (error: any) {
        console.error('Failed to set up push notifications:', error);
        return {
            success: false,
            permission: 'granted',
            error: error.message || 'Failed to complete push setup.',
        };
    }
};

/**
 * Disable notifications for the current device and update user record in Firestore.
 */
export const disableNotifications = async (
    userId: string, 
    targetCollection: 'users' | 'riders'
): Promise<boolean> => {
    try {
        const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('calebdeck_fcm_token') : null;
        const userRef = doc(db, targetCollection, userId);
        const updatePayload: any = { 
            notificationsEnabled: false,
            updatedAt: Date.now()
        };
        if (storedToken) {
            updatePayload.fcmTokens = arrayRemove(storedToken);
        }
        await setDoc(userRef, updatePayload, { merge: true });
        if (storedToken && typeof localStorage !== 'undefined') {
            localStorage.removeItem('calebdeck_fcm_token');
        }
        return true;
    } catch (err) {
        console.warn('Failed to disable notifications in database:', err);
        return false;
    }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
    let unsubscribe: (() => void) | null = null;
    let active = true;

    getMessagingInstance().then((msg) => {
        if (!msg || !active) return;
        try {
            unsubscribe = onMessage(msg, (payload) => {
                callback(payload);
            });
        } catch (e) {
            console.warn('Could not register onMessage listener:', e);
        }
    }).catch(() => {});

    return () => {
        active = false;
        if (unsubscribe) unsubscribe();
    };
};

/**
 * Sends a push notification to a specific user using the /api/utils/send-push endpoint.
 * Called by admin/rider clients when updating order status.
 */
export const sendOrderStatusPushNotification = async (
    userId: string, 
    status: string, 
    orderId: string, 
    idToken: string
) => {
    if (!userId || userId === 'admin') return;
    
    // Friendly customer-facing notification copy
    const copyMap: Record<string, {title: string, body: string}> = {
        'PAID': { title: 'Order confirmed', body: 'Your order has been confirmed.' },
        'PREPARING': { title: 'Preparing', body: 'Your order is being prepared.' },
        'ON_THE_WAY': { title: 'Your order is on the way 🚴', body: 'Almost there, odogwu. Your CalebDeck order is heading to you.' },
        'OUT_FOR_DELIVERY': { title: 'Your order is on the way 🚴', body: 'Almost there, odogwu. Your CalebDeck order is heading to you.' },
        'DELIVERED': { title: 'Delivered 🎉', body: 'Your order has arrived. Enjoy, odogwu 😂' },
        'READY_FOR_DELIVERY': { title: 'Ready for pickup', body: 'Your order is moving to the next stage.' },
        'CONSOLIDATING': { title: 'Processing', body: 'Your order is moving to the next stage.' },
        'PROCUREMENT': { title: 'Processing', body: 'Your order is moving to the next stage.' },
        'ARRIVING_AT_CAMPUS': { title: 'Arriving soon', body: 'Your order is moving to the next stage.' }
    };

    const copy = copyMap[status];
    if (!copy) return;

    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return;
        
        const fcmTokens = userDoc.data().fcmTokens;
        if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) return;

        await fetch('/api/utils/send-push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                title: copy.title,
                body: copy.body,
                tokens: fcmTokens,
                link: `/my-orders`,
                userId,
                targetCollection: 'users'
            })
        });
    } catch (err) {
        console.warn('Failed to send push notification:', err);
    }
};
