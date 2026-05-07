import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from '../firebase-admin';
import { getClubkonnectConfig, requireAdmin, setCors } from '../calebnet';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(401).json({ error: 'Admin access required' });

        const db = adminDb();
        const config = getClubkonnectConfig();
        await db.collection('settings').doc('platform').get();

        return res.status(200).json({
            success: true,
            firebaseAdmin: 'OK',
            clubkonnect: {
                userIdConfigured: !!config.userId,
                apiKeyConfigured: !!config.apiKey,
                baseUrl: config.baseUrl,
            },
        });
    } catch (error: any) {
        console.error('[CalebNet Diagnostics]', error);
        return res.status(500).json({ error: error.message || 'Diagnostics failed' });
    }
}
