import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ICAClient } from 'iglobals-auth-client';
import crypto from 'crypto';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL_ENV;
        
        const redirectUri = isLocal 
            ? 'http://localhost:3000/api/auth/callback' 
            : 'https://calebdeck.com/api/auth/callback';

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

        const isSecure = !isLocal;
        
        const cookieOptions: CookieOptions = {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 15, // 15 mins
        };

        const verifierCookie = serializeCookie('ica_code_verifier', codeVerifier, cookieOptions);
        const stateCookie = serializeCookie('ica_state', state, cookieOptions);

        const authUrl = icaClient.getAuthorizationUrl(state, codeChallenge);

        res.setHeader('Set-Cookie', [verifierCookie, stateCookie]);
        res.redirect(302, authUrl);
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to initiate login' });
    }
}
