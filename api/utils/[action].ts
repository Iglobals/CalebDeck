import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';
import { getMessaging } from 'firebase-admin/messaging';
import { ensureFirebaseAdmin } from '../../server/firebase-admin.js';
import { isRateLimited, clientIp } from '../../server/rate-limit.js';

// --- CLOUDINARY HANDLERS ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function handleCloudinary(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { paramsToSign } = req.body || {};
    
    if (!paramsToSign) {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, upload_preset: 'calebdeck' },
        process.env.CLOUDINARY_API_SECRET || ''
      );
      
      return res.status(200).json({ 
        timestamp, 
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY 
      });
    }

    try {
      const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET || ''
      );
      return res.status(200).json({ 
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY 
      });
    } catch (error) {
      console.error('Signing error:', error);
      return res.status(500).json({ error: 'Failed to sign request' });
    }
  }

  if (req.method === 'DELETE') {
    const { public_id, resource_type = 'image' } = req.query;
    
    if (!public_id || typeof public_id !== 'string') {
      return res.status(400).json({ error: 'Missing public_id' });
    }

    try {
      const result = await cloudinary.uploader.destroy(public_id, { resource_type: resource_type as string });
      return res.status(200).json(result);
    } catch (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete media' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// --- SEND PUSH HANDLERS ---
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

async function isPushAuthorized(req: VercelRequest): Promise<boolean> {
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

async function handleSendPush(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (isRateLimited(`send-push:${clientIp(req)}`, 10, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    if (!(await isPushAuthorized(req))) {
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

// --- ROUTER ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Shared CORS configuration
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Api-Key');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action;

    try {
        if (action === 'cloudinary') return await handleCloudinary(req, res);
        if (action === 'send-push') return await handleSendPush(req, res);

        return res.status(404).json({ error: 'Util route not found', action });
    } catch (err: any) {
        console.error(`[utils/${action}] Handler error:`, err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
