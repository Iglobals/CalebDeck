import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function ensureFirebaseAdmin() {
    if (getApps().length > 0) return getApps()[0];

    const projectId = process.env.FB_SA_PROJECT_ID;
    const clientEmail = process.env.FB_SA_CLIENT_EMAIL;
    let privateKey = process.env.FB_SA_PRIVATE_KEY || '';

    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
    }
    if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase Admin environment variables are not configured');
    }

    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function adminDb() {
    ensureFirebaseAdmin();
    return getFirestore();
}
