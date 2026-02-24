import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
    try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!raw) {
            console.error('[firebase-admin] FIREBASE_SERVICE_ACCOUNT env var is missing!');
            throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
        }

        let serviceAccount;
        try {
            serviceAccount = JSON.parse(raw);
        } catch (parseError) {
            console.error('[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseError);
            throw parseError;
        }

        // Ensure private key newlines are actual newlines (Vercel may escape them)
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('[firebase-admin] ✓ Initialized for project:', serviceAccount.project_id);
    } catch (error: any) {
        console.error('[firebase-admin] Init failed:', error.message);
        // Don't re-throw — let individual endpoints handle the missing app
    }
}

export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export default admin;
