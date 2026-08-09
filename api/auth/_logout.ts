import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ICAClient } from 'iglobals-auth-client';
import { adminDb, ensureFirebaseAdmin } from '../../server/firebase-admin.js';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const db = adminDb();
        ensureFirebaseAdmin();
        const auth = getAuth();

        // 1. Get Firebase ID token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const idToken = authHeader.split('Bearer ')[1];
        
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
        } catch (error) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const uid = decodedToken.uid;

        // 2. Fetch the user's ICA refresh token from Firestore
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        const refreshToken = userData?.icaRefreshToken;

        if (refreshToken) {
            // 3. Initialize ICA Client and revoke the token
            const icaClient = new ICAClient({
                baseUrl: process.env.ICA_BASE_URL || 'https://iglobals-c-auth-web.vercel.app',
                clientId: process.env.ICA_CLIENT_ID || '',
                clientSecret: process.env.ICA_CLIENT_SECRET || '',
                redirectUri: process.env.ICA_REDIRECT_URI || '',
                scopes: ['openid']
            });

            try {
                // The ICAClient might not expose a `revokeToken` method directly if it's old,
                // but standard OAuth 2.0 uses /api/auth/revoke.
                // We'll use fetch directly since we know the endpoint.
                const revokeUrl = `${process.env.ICA_BASE_URL}/api/auth/revoke`;
                const basicAuth = Buffer.from(`${process.env.ICA_CLIENT_ID}:${process.env.ICA_CLIENT_SECRET}`).toString('base64');
                
                const revokeRes = await fetch(revokeUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${basicAuth}`
                    },
                    body: new URLSearchParams({
                        token: refreshToken,
                        token_type_hint: 'refresh_token'
                    }).toString()
                });

                if (!revokeRes.ok) {
                    console.warn(`Failed to revoke token on ICA server: ${revokeRes.status} ${revokeRes.statusText}`);
                }
            } catch (err) {
                console.warn('Network error while revoking ICA token:', err);
            }

            // 4. Clear the refresh token from Firestore
            await userRef.update({
                icaRefreshToken: FieldValue.delete()
            });
        }

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('Logout handler error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
