import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ICAClient } from 'iglobals-auth-client';
import { adminDb, ensureFirebaseAdmin } from '../../server/firebase-admin.js';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
    maxAge?: number;
}

function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
    let str = `${name}=${encodeURIComponent(value)}`;
    if (opts.path) str += `; Path=${opts.path}`;
    if (opts.httpOnly) str += '; HttpOnly';
    if (opts.secure) str += '; Secure';
    if (opts.sameSite) str += `; SameSite=${opts.sameSite.charAt(0).toUpperCase() + opts.sameSite.slice(1)}`;
    if (opts.maxAge !== undefined) str += `; Max-Age=${opts.maxAge}`;
    return str;
}

function parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(pair => {
        const [key, ...rest] = pair.trim().split('=');
        if (key) cookies[key.trim()] = decodeURIComponent(rest.join('=').trim());
    });
    return cookies;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const db = adminDb();
        ensureFirebaseAdmin();
        const auth = getAuth();
        
        // 1. Rate Limiting (Firestore-based by IP)
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
        if (ip !== 'unknown') {
            const cleanIp = Array.isArray(ip) ? ip[0] : ip.split(',')[0].trim();
            const rlRef = db.collection('rate_limits').doc(`ica_callback_${cleanIp}`);
            const rlDoc = await rlRef.get();
            const now = Date.now();
            
            if (rlDoc.exists) {
                const data = rlDoc.data()!;
                if (now - data.timestamp < 1000 * 60) { // 1 minute window
                    if (data.count >= 10) { // Max 10 attempts per minute
                        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
                    }
                    await rlRef.update({ count: FieldValue.increment(1) });
                } else {
                    await rlRef.set({ timestamp: now, count: 1 });
                }
            } else {
                await rlRef.set({ timestamp: now, count: 1 });
            }
        }

        const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL_ENV;
        const redirectUri = isLocal 
            ? 'http://localhost:3000/api/auth/callback' 
            : 'https://calebdeck.com/api/auth/callback';

        const icaClient = new ICAClient({
            baseUrl: process.env.ICA_BASE_URL!,
            clientId: process.env.ICA_CLIENT_ID!,
            clientSecret: process.env.ICA_CLIENT_SECRET!,
            redirectUri,
            scopes: ['openid', 'profile', 'email'],
        });

        // 2. Read query params and cookies
        const { code, state, error, error_description } = req.query;
        
        if (error) {
            return res.redirect(302, `/?auth_error=${encodeURIComponent(String(error_description || error))}`);
        }

        if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
            return res.redirect(302, '/?auth_error=' + encodeURIComponent('Missing code or state parameter'));
        }

        const cookies = parseCookies(req.headers.cookie || '');
        const storedCodeVerifier = cookies['ica_code_verifier'];
        const storedState = cookies['ica_state'];

        // 3. Clear the cookies immediately
        const clearCookieOptions: CookieOptions = {
            httpOnly: true,
            secure: !isLocal,
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
        };
        const clearVerifierCookie = serializeCookie('ica_code_verifier', '', clearCookieOptions);
        const clearStateCookie = serializeCookie('ica_state', '', clearCookieOptions);
        
        let cookiesToSet = [clearVerifierCookie, clearStateCookie];

        const redirectWithError = (msg: string) => {
            if (cookiesToSet.length > 0) res.setHeader('Set-Cookie', cookiesToSet);
            return res.redirect(302, `/?auth_error=${encodeURIComponent(msg)}`);
        };

        // 4. Validate State (CSRF protection)
        if (!storedState || state !== storedState) {
            return redirectWithError('State mismatch. Please try logging in again.');
        }

        if (!storedCodeVerifier) {
            return redirectWithError('Missing code verifier. Please try logging in again.');
        }

        // 5. Exchange code for tokens
        const tokens = await icaClient.exchangeCode(code, storedCodeVerifier);
        
        // 6. Verify ID token and extract claims
        const claims = await icaClient.verifyToken(tokens.id_token);

        if (!claims.email_verified) {
            return redirectWithError('Email must be verified to sign in.');
        }
        
        if (!claims.email) {
            return redirectWithError('Email claim is missing from token.');
        }

        // 7. Firebase User Resolution
        let uid: string;
        
        try {
            const userRecord = await auth.getUserByEmail(claims.email);
            uid = userRecord.uid;
            
            // Keep icaSub in sync for existing users
            await db.collection('users').doc(uid).set({
                icaSub: claims.sub,
                ...(tokens.refresh_token ? { icaRefreshToken: tokens.refresh_token } : {})
            }, { merge: true });
            
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Create a new user
                const newUser = await auth.createUser({
                    email: claims.email,
                    emailVerified: true,
                    displayName: claims.name || claims.given_name || '',
                });
                uid = newUser.uid;
                
                // Set default student role and icaSub
                await db.collection('users').doc(uid).set({
                    role: 'STUDENT',
                    email: claims.email,
                    icaSub: claims.sub,
                    walletBalance: 0,
                    createdAt: FieldValue.serverTimestamp(),
                    ...(tokens.refresh_token ? { icaRefreshToken: tokens.refresh_token } : {})
                }, { merge: true });
            } else {
                throw error; // Rethrow unexpected errors
            }
        }

        // 8. Mint Custom Token
        const customToken = await auth.createCustomToken(uid);

        // 9. Set custom token as a short-lived (30s) non-httpOnly cookie
        const customTokenCookie = serializeCookie('ica_custom_token', customToken, {
            httpOnly: false, // Must be readable by frontend JS
            secure: !isLocal,
            sameSite: 'lax',
            path: '/',
            maxAge: 30, // 30 seconds
        });
        
        cookiesToSet.push(customTokenCookie);

        // 10. Redirect to frontend
        res.setHeader('Set-Cookie', cookiesToSet);
        res.redirect(302, '/');

    } catch (error: any) {
        console.error('Callback error:', error);
        res.redirect(302, '/?auth_error=' + encodeURIComponent('Authentication failed'));
    }
}
