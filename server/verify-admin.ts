import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';

/**
 * Verify that the request is from an authenticated admin user.
 * Returns the decoded token if valid, or null if not.
 */
export async function verifyAdmin(req: VercelRequest): Promise<{ uid: string; email?: string } | null> {
    try {
        if (getApps().length === 0) return null;

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

        const idToken = authHeader.replace('Bearer ', '');
        const decodedToken = await getAuth().verifyIdToken(idToken);

        // Check user's role in Firestore
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists || userDoc.data()?.role !== 'ADMIN') {
            return null;
        }

        return { uid: decodedToken.uid, email: decodedToken.email };
    } catch (error) {
        console.error('Admin auth verification failed:', error);
        return null;
    }
}
