import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
    try {
        const projectId = process.env.FB_SA_PROJECT_ID;
        const clientEmail = process.env.FB_SA_CLIENT_EMAIL;
        let privateKey = process.env.FB_SA_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            console.error('[firebase-admin] Missing env vars. Got:', {
                projectId: !!projectId,
                clientEmail: !!clientEmail,
                privateKey: !!privateKey,
            });
            throw new Error('Firebase service account env vars not configured');
        }

        // Ensure private key newlines are actual newlines (Vercel escapes them)
        privateKey = privateKey.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
        console.log('[firebase-admin] ✓ Initialized for project:', projectId);
    } catch (error: any) {
        console.error('[firebase-admin] Init failed:', error.message);
    }
}

export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export default admin;
