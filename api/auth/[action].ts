import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ICAClient } from 'iglobals-auth-client';
import crypto from 'crypto';
import { adminDb, ensureFirebaseAdmin } from '../../server/firebase-admin.js';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Shared Utilities ───────────────────────────────────────────────

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

function getEnvConfig() {
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL_ENV;
    // Prefer the env var so .env controls it; fallback to sensible defaults
    const redirectUri = process.env.ICA_REDIRECT_URI?.trim()
        || (isLocal
            ? 'http://localhost:3000/api/auth/callback'
            : 'https://calebdeck.com/api/auth/callback');
    return { isLocal, redirectUri };
}

// ─── LOGIN Handler ──────────────────────────────────────────────────

async function handleLogin(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { isLocal, redirectUri } = getEnvConfig();

    if (!process.env.ICA_BASE_URL || !process.env.ICA_CLIENT_ID || !process.env.ICA_CLIENT_SECRET) {
        console.error("Missing ICA environment variables.");
        return res.status(500).json({ error: 'Auth configuration missing' });
    }

    const icaClient = new ICAClient({
        baseUrl: process.env.ICA_BASE_URL,
        clientId: process.env.ICA_CLIENT_ID,
        clientSecret: process.env.ICA_CLIENT_SECRET,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
    });

    const { codeVerifier, codeChallenge } = icaClient.generatePKCE();
    const state = crypto.randomUUID();

    // Capture the origin the user came from so the callback can redirect back
    const returnTo = typeof req.query.return_to === 'string' ? req.query.return_to : '';

    const isSecure = !isLocal;

    const cookieOptions: CookieOptions = {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 15,
    };

    const verifierCookie = serializeCookie('ica_code_verifier', codeVerifier, cookieOptions);
    const stateCookie = serializeCookie('ica_state', state, cookieOptions);
    // Store the return-to origin so the callback can redirect the user back
    const returnToCookie = serializeCookie('ica_return_to', returnTo, cookieOptions);

    const authUrl = icaClient.getAuthorizationUrl(state, codeChallenge);

    res.setHeader('Set-Cookie', [verifierCookie, stateCookie, returnToCookie]);
    res.redirect(302, authUrl);
}

// ─── CALLBACK Handler ───────────────────────────────────────────────

async function handleCallback(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
            if (now - data.timestamp < 1000 * 60) {
                if (data.count >= 10) {
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

    const { isLocal, redirectUri } = getEnvConfig();

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

    } catch (resolveError: any) {
        if (resolveError.code === 'auth/user-not-found') {
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
            throw resolveError;
        }
    }

    // 8. Mint Custom Token
    const customToken = await auth.createCustomToken(uid);

    // 9. Set custom token as a short-lived (30s) non-httpOnly cookie
    const customTokenCookie = serializeCookie('ica_custom_token', customToken, {
        httpOnly: false,
        secure: !isLocal,
        sameSite: 'lax',
        path: '/',
        maxAge: 30,
    });

    cookiesToSet.push(customTokenCookie);

    // 10. Redirect to frontend — if the user came from localhost, send them back there
    const returnTo = cookies['ica_return_to'] || '';
    const clearReturnToCookie = serializeCookie('ica_return_to', '', clearCookieOptions);
    cookiesToSet.push(clearReturnToCookie);

    res.setHeader('Set-Cookie', cookiesToSet);

    if (returnTo && returnTo.startsWith('http://localhost')) {
        // Redirect back to local dev with the token as a query param
        // (cookie won't survive cross-origin, so pass it explicitly)
        const localUrl = new URL('/', returnTo);
        localUrl.searchParams.set('ica_token', customToken);
        return res.redirect(302, localUrl.toString());
    }

    res.redirect(302, '/');
}

// ─── LOGOUT Handler ─────────────────────────────────────────────────

async function handleLogout(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
    } catch (verifyErr) {
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
        try {
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

        // 3. Clear the refresh token from Firestore
        await userRef.update({
            icaRefreshToken: FieldValue.delete()
        });
    }

    return res.status(200).json({ success: true });
}

// ─── Router ─────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = req.query.action;

    try {
        if (action === 'login') return await handleLogin(req, res);
        if (action === 'callback') return await handleCallback(req, res);
        if (action === 'logout') return await handleLogout(req, res);

        return res.status(404).json({ error: 'Auth route not found', action });
    } catch (err: any) {
        console.error(`[auth/${action}] Handler error:`, err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
