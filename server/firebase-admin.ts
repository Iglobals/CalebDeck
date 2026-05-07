import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function ensureFirebaseAdmin() {
    if (getApps().length > 0) return getApps()[0];

    let projectId = process.env.FB_SA_PROJECT_ID;
    let clientEmail = process.env.FB_SA_CLIENT_EMAIL;
    let privateKey = process.env.FB_SA_PRIVATE_KEY || '';

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if ((!projectId || !clientEmail || !privateKey) && serviceAccountJson) {
        try {
            const serviceAccount = JSON.parse(serviceAccountJson);
            projectId = projectId || serviceAccount.project_id;
            clientEmail = clientEmail || serviceAccount.client_email;
            privateKey = privateKey || serviceAccount.private_key || '';
        } catch (error) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
        }
    }

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
