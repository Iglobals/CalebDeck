import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export const adminDb = admin.firestore();
export default admin;
