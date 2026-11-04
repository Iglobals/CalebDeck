import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, isSupported, Messaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const analytics = getAnalytics(app);
export { analytics };

// Lazy and safe FCM messaging loader (handles iOS Safari / PWA unsupported or delayed states)
let messagingInstance: Messaging | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

export async function getMessagingInstance(): Promise<Messaging | null> {
    if (typeof window === 'undefined') return null;
    if (messagingInstance) return messagingInstance;
    if (!messagingPromise) {
        messagingPromise = (async () => {
            try {
                const supported = await isSupported().catch(() => false);
                if (!supported) {
                    console.warn("Firebase Messaging is not supported on this browser or platform.");
                    return null;
                }
                messagingInstance = getMessaging(app);
                return messagingInstance;
            } catch (err) {
                console.warn("Firebase Messaging initialization deferred/failed:", err);
                return null;
            }
        })();
    }
    return messagingPromise;
}

// Export for backward compatibility (may be null initially, use getMessagingInstance() for robust access)
export let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
    getMessagingInstance().then((inst) => {
        if (inst) messaging = inst;
    }).catch(() => {});
}

export default app;
