import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../../_lib/firebase-admin';
import { normalizeNetwork, normalizeType, requireAdmin, setCors } from '../../_lib/calebnet';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(401).json({ error: 'Admin access required' });

        const network = normalizeNetwork(req.body?.network);
        const type = normalizeType(req.body?.type);
        if (!network || !type) return res.status(400).json({ error: 'Valid network and type are required' });

        await adminDb().collection('calebnet_provider_status').doc(`clubkonnect_${type}_${network}`).set({
            provider: 'clubkonnect',
            network,
            type,
            status: 'HEALTHY',
            failureCount: 0,
            lastChecked: FieldValue.serverTimestamp(),
            lastFailureReason: null,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('[CalebNet Provider Reset]', error);
        return res.status(500).json({ error: 'Unable to reset provider status' });
    }
}
