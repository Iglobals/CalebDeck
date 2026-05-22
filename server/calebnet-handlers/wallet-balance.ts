import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clubkonnectGet, getClubkonnectConfig, requireAdmin, setCors } from '../calebnet.js';

function parseProviderBalance(value: any) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
}

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
        const balance = parseProviderBalance(data?.balance);
        const status = String(data?.status || data?.Status || '').toUpperCase();
        if (balance === null || status.includes('INVALID') || status.includes('MISSING') || status.includes('ERROR')) {
            return res.status(502).json({
                error: 'Clubkonnect did not return a valid wallet balance. Please check the provider account or API credentials.',
                providerStatus: data?.status || data?.Status || null,
                providerResponse: data,
            });
        }

        return res.status(200).json({
            success: true,
            balance,
            message: `Clubkonnect wallet balance is ₦${balance.toLocaleString()}.`,
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
