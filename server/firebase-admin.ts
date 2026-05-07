import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createPrivateKey } from 'crypto';

export function readFirebaseAdminEnv() {
    let projectId = process.env.FB_SA_PROJECT_ID;
    let clientEmail = process.env.FB_SA_CLIENT_EMAIL;
    let privateKey = process.env.FB_SA_PRIVATE_KEY || '';

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if ((!projectId || !clientEmail || !privateKey) && serviceAccountJson) {
        try {
            const parsed = JSON.parse(serviceAccountJson);
            const serviceAccount = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
            projectId = projectId || serviceAccount.project_id;
            clientEmail = clientEmail || serviceAccount.client_email;
            privateKey = privateKey || serviceAccount.private_key || '';
        } catch (error) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
        }
    }

    const maybeJsonPrivateKey = privateKey.trim();
    if (maybeJsonPrivateKey.startsWith('{') && maybeJsonPrivateKey.endsWith('}')) {
        try {
            const serviceAccount = JSON.parse(maybeJsonPrivateKey);
            privateKey = serviceAccount.private_key || privateKey;
            projectId = projectId || serviceAccount.project_id;
            clientEmail = clientEmail || serviceAccount.client_email;
        } catch {
            // Leave the original value so validation below can report the key issue.
        }
    }

    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        try {
            privateKey = JSON.parse(privateKey);
        } catch {
            privateKey = privateKey.slice(1, -1);
        }
    }
    if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    return { projectId, clientEmail, privateKey, serviceAccountJsonConfigured: !!serviceAccountJson };
}

export function validateFirebasePrivateKey(privateKey: string) {
    if (!privateKey) return { ok: false, error: 'Firebase private key is missing' };
    if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        return { ok: false, error: 'Firebase private key must include BEGIN PRIVATE KEY and END PRIVATE KEY' };
    }

    try {
        createPrivateKey(privateKey);
        return { ok: true, error: null };
    } catch {
        return {
            ok: false,
            error: 'Firebase private key is malformed. In Vercel, FB_SA_PRIVATE_KEY must be exactly the private_key value from the service account JSON, with newline escapes kept as \\n.',
        };
    }
}

export function getFirebaseAdminEnvDiagnostics() {
    try {
        const env = readFirebaseAdminEnv();
        const keyValidation = validateFirebasePrivateKey(env.privateKey);
        return {
            ok: !!env.projectId && !!env.clientEmail && !!env.privateKey && keyValidation.ok,
            projectIdConfigured: !!env.projectId,
            clientEmailConfigured: !!env.clientEmail,
            privateKeyConfigured: !!env.privateKey,
            privateKeyLooksValid: env.privateKey.includes('BEGIN PRIVATE KEY') && env.privateKey.includes('END PRIVATE KEY'),
            privateKeyDecodes: keyValidation.ok,
            serviceAccountJsonConfigured: env.serviceAccountJsonConfigured,
            error: keyValidation.error,
        };
    } catch (error: any) {
        return {
            ok: false,
            projectIdConfigured: !!process.env.FB_SA_PROJECT_ID,
            clientEmailConfigured: !!process.env.FB_SA_CLIENT_EMAIL,
            privateKeyConfigured: !!process.env.FB_SA_PRIVATE_KEY,
            privateKeyLooksValid: false,
            privateKeyDecodes: false,
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
    const privateKeyValidation = validateFirebasePrivateKey(privateKey);
    if (!privateKeyValidation.ok) {
        throw new Error(privateKeyValidation.error || 'Firebase private key is malformed');
    }

    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function adminDb() {
    ensureFirebaseAdmin();
    return getFirestore();
}
