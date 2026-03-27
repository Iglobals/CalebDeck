import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
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
        // Wait for the SW to be ready
        await navigator.serviceWorker.ready;
        return registration;
    } catch (err) {
        console.warn('Service worker registration failed:', err);
        return undefined;
    }
};

const acquireFCMToken = async (retries = 2): Promise<string | null> => {
    if (!messaging) return null;

    // Get SW registration first
    const swRegistration = await getServiceWorkerRegistration();

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: swRegistration,
            });
            if (token) return token;
        } catch (err) {
            console.warn(`FCM token attempt ${attempt + 1} failed:`, err);
            if (attempt < retries - 1) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    return null;
};

export const requestNotificationPermissionAndSaveToken = async (userId: string, targetCollection: 'users' | 'riders' | 'admin_users') => {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await acquireFCMToken();
            if (token) {
                const userRef = doc(db, targetCollection, userId);
                await updateDoc(userRef, { fcmTokens: arrayUnion(token) }).catch(err => {
                    console.error('Error saving FCM token to Firestore', err);
                });
                console.log('Firebase Cloud Messaging token acquired and saved');
            } else {
                console.warn('Could not acquire FCM token after retries. Push notifications may not work. Try clearing site data and refreshing.');
            }
        } else {
            console.log('Notification permission not granted.');
        }
    } catch (error) {
        console.error('Failed to get FCM token', error);
    }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
    if (!messaging) return () => { };
    return onMessage(messaging, (payload) => {
        callback(payload);
    });
};
