import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function readFirebaseAdminEnv() {
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

    return { projectId, clientEmail, privateKey, serviceAccountJsonConfigured: !!serviceAccountJson };
}

export function getFirebaseAdminEnvDiagnostics() {
    try {
        const env = readFirebaseAdminEnv();
        return {
            ok: !!env.projectId && !!env.clientEmail && !!env.privateKey,
            projectIdConfigured: !!env.projectId,
            clientEmailConfigured: !!env.clientEmail,
            privateKeyConfigured: !!env.privateKey,
            privateKeyLooksValid: env.privateKey.includes('BEGIN PRIVATE KEY') && env.privateKey.includes('END PRIVATE KEY'),
            serviceAccountJsonConfigured: env.serviceAccountJsonConfigured,
            error: null,
        };
    } catch (error: any) {
        return {
            ok: false,
            projectIdConfigured: !!process.env.FB_SA_PROJECT_ID,
            clientEmailConfigured: !!process.env.FB_SA_CLIENT_EMAIL,
            privateKeyConfigured: !!process.env.FB_SA_PRIVATE_KEY,
            privateKeyLooksValid: false,
            serviceAccountJsonConfigured: !!process.env.FIREBASE_SERVICE_ACCOUNT,
            error: error.message || 'Firebase Admin environment check failed',
        };
    }
}

export function ensureFirebaseAdmin() {
    if (getApps().length > 0) return getApps()[0];

    const { projectId, clientEmail, privateKey } = readFirebaseAdminEnv();

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase Admin environment variables are not configured');
    }

    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function adminDb() {
    ensureFirebaseAdmin();
    return getFirestore();
}
