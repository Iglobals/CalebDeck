import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../calebnet.js';
import { verifyUser } from '../verify-user.js';
import { ensureWalletUser } from '../wallet.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const user = await verifyUser(req);
        if (!user) return res.status(401).json({ error: 'Sign in to use CalebNet.' });

        const body = req.body || {};
        await ensureWalletUser(user.uid, {
            email: user.email || body.email || undefined,
            displayName: user.name || body.displayName || undefined,
            phoneNumber: user.phoneNumber || body.phoneNumber || undefined,
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('[Wallet Profile Ensure]', error);
        return res.status(500).json({ error: error.message || 'Could not prepare wallet profile.' });
    }
}
