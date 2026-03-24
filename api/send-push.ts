import { VercelRequest, VercelResponse } from '@vercel/node';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin lazily
if (!getApps().length) {
    try {
        let privateKey = process.env.FB_SA_PRIVATE_KEY || '';
        if (privateKey) {
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.substring(1, privateKey.length - 1);
            }
            if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
                privateKey = privateKey.substring(1, privateKey.length - 1);
            }
            privateKey = privateKey.replace(/\\n/g, '\n');
        }

        initializeApp({
            credential: cert({
                projectId: process.env.FB_SA_PROJECT_ID,
                clientEmail: process.env.FB_SA_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // API key required — prevents external abuse
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
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
