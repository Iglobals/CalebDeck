import { getAuth } from 'firebase-admin/auth';
import type { VercelRequest } from '@vercel/node';
import { ensureFirebaseAdmin } from './firebase-admin.js';

export interface VerifiedUser {
    uid: string;
    email?: string;
    name?: string;
    phoneNumber?: string;
}

export async function verifyUser(req: VercelRequest): Promise<VerifiedUser | null> {
    try {
        ensureFirebaseAdmin();
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

        const idToken = authHeader.replace('Bearer ', '').trim();
        const decoded = await getAuth().verifyIdToken(idToken);
        return {
            uid: decoded.uid,
            email: decoded.email,
            name: decoded.name,
            phoneNumber: decoded.phone_number,
        };
    } catch (error) {
        console.error('[Verify User] Token verification failed:', error);
        return null;
    }
}
