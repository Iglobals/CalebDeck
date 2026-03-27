import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

const acquireFCMToken = async (retries = 2): Promise<string | null> => {
    if (!messaging) return null;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
            });
            if (token) return token;
        } catch (err) {
            console.warn(`FCM token attempt ${attempt + 1} failed:`, err);
            if (attempt < retries - 1) {
                // Wait before retry — push service may need time to register
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
