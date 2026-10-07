import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Explicitly register the Firebase messaging service worker FIRST,
 * then pass its registration to getToken(). This prevents the
 * AbortError caused by Firebase trying to auto-register a conflicting SW.
 */
const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | undefined> => {
    if (!('serviceWorker' in navigator)) return undefined;
    try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
        });
        await navigator.serviceWorker.ready;
        return registration;
    } catch (err) {
        console.warn('Service worker registration failed:', err);
        return undefined;
    }
};

const acquireFCMToken = async (swRegistration?: ServiceWorkerRegistration, retries = 3): Promise<string | null> => {
    if (!messaging) return null;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const tokenOptions: any = {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
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
                await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            }
        }
    }
    return null;
};

/**
 * Request notification permission and save FCM token to Firestore.
 * targetCollection: 'users' for admins, 'riders' for riders
 */
export const requestNotificationPermissionAndSaveToken = async (userId: string, targetCollection: 'users' | 'riders') => {
    if (!messaging) {
        console.warn('Firebase Messaging not available');
        return;
    }
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission not granted.');
            return;
        }

        // Step 1: Register the SW
        const swRegistration = await getServiceWorkerRegistration();

        // Step 2: Get FCM token (separate from Firestore save)
        const token = await acquireFCMToken(swRegistration);

        if (!token) {
            console.warn('Could not acquire FCM token after retries. Push notifications may not work.');
            return;
        }

        // Step 3: Save token to Firestore — use setDoc with merge so it works
        // even if the document doesn't exist yet
        try {
            const userRef = doc(db, targetCollection, userId);
            await setDoc(userRef, { fcmTokens: arrayUnion(token) }, { merge: true });
            console.log(`FCM token saved to ${targetCollection}/${userId}`);
        } catch (err) {
            console.error('Error saving FCM token to Firestore:', err);
            // Token was still acquired — push may work if the backend has old tokens
        }
    } catch (error) {
        console.error('Failed to set up push notifications:', error);
    }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
    if (!messaging) return () => { };
    return onMessage(messaging, (payload) => {
        callback(payload);
    });
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
        // Fetch user's tokens
        const { getDoc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return;
        
        const fcmTokens = userDoc.data().fcmTokens;
        if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) return;

        // Call the serverless function securely
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
                link: `/my-orders`
            })
        });
    } catch (err) {
        console.warn('Failed to send push notification:', err);
    }
};
