import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../server/firebase-admin.js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const db = adminDb();
        const { code } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'Access code is required' });
        }

        // IP-based Rate Limiting (5 attempts per 15 minutes)
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const ipString = Array.isArray(ip) ? ip[0] : ip;
        const attemptRef = db.collection('vendor_auth_attempts').doc(ipString.replace(/[:.]/g, '_'));
        
        const attemptDoc = await attemptRef.get();
        const now = new Date();
        const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

        let attempts = 0;
        let lastAttempt = now;

        if (attemptDoc.exists) {
            const data = attemptDoc.data()!;
            const docLastAttempt = data.lastAttempt?.toDate() || new Date(0);

            if (data.lockedUntil && data.lockedUntil.toDate() > now) {
                const waitMins = Math.ceil((data.lockedUntil.toDate().getTime() - now.getTime()) / 60000);
                return res.status(429).json({ error: `Too many attempts. Try again in ${waitMins} minutes.` });
            }

            if (docLastAttempt > fifteenMinsAgo) {
                attempts = data.attempts || 0;
            }
        }

        if (attempts >= 5) {
            const lockTime = new Date(now.getTime() + 15 * 60 * 1000); // Lock for 15 mins
            await attemptRef.set({
                ip: ipString,
                attempts: attempts + 1,
                lastAttempt: FieldValue.serverTimestamp(),
                lockedUntil: lockTime
            }, { merge: true });
            
            return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
        }

        // Authenticate the code
        const vendorsSnap = await db.collection('business_vendors')
            .where('accessCode', '==', code.trim())
            .limit(1)
            .get();

        if (vendorsSnap.empty) {
            // Log failed attempt
            await attemptRef.set({
                ip: ipString,
                attempts: attempts + 1,
                lastAttempt: FieldValue.serverTimestamp()
            }, { merge: true });

            return res.status(401).json({ error: 'Invalid access code', remaining: 5 - (attempts + 1) });
        }

        // Success - clear attempts
        if (attemptDoc.exists) {
            await attemptRef.delete();
        }

        const vendorData = vendorsSnap.docs[0].data();
        
        return res.status(200).json({
            data: {
                vendor: {
                    id: vendorsSnap.docs[0].id,
                    vendorId: vendorData.vendorId,
                    businessName: vendorData.businessName,
                    subscriptionEndDate: vendorData.subscriptionEndDate,
                    subscriptionStartDate: vendorData.subscriptionStartDate,
                    subscriptionPlan: vendorData.subscriptionPlan,
                    category: vendorData.category
                }
            }
        });

    } catch (error: any) {
        console.error('Vendor auth error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
