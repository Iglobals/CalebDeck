import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../_lib/firebase-admin';
import { clubkonnectGet, getClubkonnectConfig, NETWORK_CODES, normalizeNetwork, requireAdmin, setCors } from '../_lib/calebnet';

function collectRows(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.discounts)) return raw.discounts;
    if (Array.isArray(raw?.data)) return raw.data;
    if (raw && typeof raw === 'object') return Object.entries(raw).map(([network, value]) => ({ network, value }));
    return [];
}

function extractDiscount(row: any) {
    const candidate = row?.discount ?? row?.Discount ?? row?.discountPercent ?? row?.percentage ?? row?.value;
    const value = typeof candidate === 'string' ? candidate.replace('%', '') : candidate;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(401).json({ error: 'Admin access required' });

        const db = adminDb();
        const { userId } = getClubkonnectConfig();
        const raw = await clubkonnectGet('/APIAirtimeDiscountV2.asp', { UserID: userId }, 20000);
        const rows = collectRows(raw);
        const batch = db.batch();
        let count = 0;

        rows.forEach((row) => {
            const network = normalizeNetwork(row.network || row.Network || row.name || row.NetworkName);
            if (!network) return;
            const discount = extractDiscount(row);
            const id = `clubkonnect_AIRTIME_${network}`;
            batch.set(db.collection('calebnet_catalog').doc(id), {
                id,
                type: 'AIRTIME',
                network,
                name: `${network} Airtime`,
                displayName: `${network} Airtime`,
                description: 'Instant airtime top-up',
                validity: null,
                dataSize: null,
                sellingPrice: 0,
                providerCost: 0,
                profit: 0,
                provider: 'clubkonnect',
                providerPlanCode: null,
                providerNetworkCode: NETWORK_CODES[network],
                category: 'AIRTIME',
                airtimeDiscountPercent: discount,
                isActive: false,
                isFeatured: false,
                rawDiscount: row,
                updatedAt: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            count += 1;
        });

        if (count > 0) await batch.commit();
        return res.status(200).json({ success: true, count });
    } catch (error: any) {
        console.error('[CalebNet Sync Airtime Discounts]', error);
        return res.status(500).json({ error: error.message || 'Airtime discount sync failed' });
    }
}
