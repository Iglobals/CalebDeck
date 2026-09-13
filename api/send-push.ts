import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMessaging } from 'firebase-admin/messaging';
import { ensureFirebaseAdmin } from '../server/firebase-admin.js';
import { isRateLimited, clientIp } from '../server/rate-limit.js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

async function isAuthorized(req: VercelRequest): Promise<boolean> {
    // Trusted callers (other serverless functions) present the internal API key.
    // Browser callers send a Firebase ID token instead — the bundled VITE key is
    // public by definition and must not be the only gate.
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (expectedKey && apiKey === expectedKey) return true;

    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        try {
            ensureFirebaseAdmin();
            const { getAuth } = await import('firebase-admin/auth');
            await getAuth().verifyIdToken(authHeader.slice('Bearer '.length));
            return true;
        } catch {
            return false;
        }
    }
    return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (isRateLimited(`send-push:${clientIp(req)}`, 10, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    if (!(await isAuthorized(req))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        ensureFirebaseAdmin();
        const { tokens, title, body, link } = req.body;

        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return res.status(400).json({ error: 'Missing or invalid tokens array' });
        }
        if (!title || !body) {
            return res.status(400).json({ error: 'Missing title or body' });
        }

        const message = {
            notification: { title, body },
            data: { link: link || '/' },
            tokens: tokens,
        };

        const response = await getMessaging().sendEachForMulticast(message);

        return res.status(200).json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount
        });
    } catch (error: any) {
        console.error('Error sending push notification:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
