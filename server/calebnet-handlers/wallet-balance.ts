import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clubkonnectGet, getClubkonnectConfig, requireAdmin, setCors } from '../calebnet';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(401).json({ error: 'Admin access required' });

        const { userId, apiKey } = getClubkonnectConfig();
        const data = await clubkonnectGet('/APIWalletBalanceV1.asp', {
            UserID: userId,
            APIKey: apiKey,
        }, 15000);

        return res.status(200).json({
            success: true,
            balance: Number(data?.balance || 0),
            wallet: {
                id: data?.id || userId,
                phone: data?.phoneno || null,
                date: data?.date || null,
            },
        });
    } catch (error: any) {
        console.error('[CalebNet Wallet Balance]', error);
        return res.status(500).json({ error: error.message || 'Unable to fetch wallet balance' });
    }
}
