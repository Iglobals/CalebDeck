import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

export const requestNotificationPermissionAndSaveToken = async (userId: string, targetCollection: 'users' | 'riders') => {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
            });
            if (token) {
                // Save token to Firestore to the user/rider document
                const userRef = doc(db, targetCollection, userId);
                await updateDoc(userRef, { fcmTokens: arrayUnion(token) }).catch(err => {
                    console.error('Error saving FCM token to Firestore', err);
                });
                console.log('Firebase Cloud Messaging token acquired and saved');
            } else {
                console.warn('No registration token available. Request permission to generate one.');
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
    // This listener triggers when the app is actively in focus
    return onMessage(messaging, (payload) => {
        callback(payload);
    });
};
