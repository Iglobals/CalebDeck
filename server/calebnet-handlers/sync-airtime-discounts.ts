import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin.js';
import { clubkonnectGet, getClubkonnectConfig, NETWORK_CODES, normalizeNetwork, requireAdmin, setCors } from '../calebnet.js';

const FALLBACK_AIRTIME_DISCOUNTS: Record<string, number> = {
    MTN: 3,
    GLO: 8,
    AIRTEL: 3,
    '9MOBILE': 7,
};

function networkFromProviderCode(value: any) {
    const code = String(value || '').trim();
    if (code === '01') return 'MTN';
    if (code === '02') return 'GLO';
    if (code === '03') return '9MOBILE';
    if (code === '04') return 'AIRTEL';
    return null;
}

function collectRows(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.discounts)) return raw.discounts;
    if (Array.isArray(raw?.data)) return raw.data;
    const mobileNetwork = raw?.MOBILE_NETWORK || raw?.mobile_network || raw?.MobileNetwork || raw?.networks;
    if (mobileNetwork) {
        const rows: any[] = [];
        const visit = (node: any, fallbackNetwork = '') => {
            if (!node) return;
            if (Array.isArray(node)) {
                node.forEach((item) => visit(item, fallbackNetwork));
                return;
            }
            if (typeof node === 'string' || typeof node === 'number') {
                if (fallbackNetwork) rows.push({ network: fallbackNetwork, value: node });
                return;
            }
            if (typeof node !== 'object') return;

            const network = networkFromProviderCode(node.ID || node.id || node.CODE || node.code) ||
                normalizeNetwork(node.NETWORK || node.Network || node.NAME || node.Name || node.name || fallbackNetwork);
            if (network && (
                node.discount !== undefined || node.Discount !== undefined ||
                node.percentage !== undefined || node.value !== undefined ||
                node.PRODUCT !== undefined || node.Product !== undefined || node.product !== undefined
            )) {
                rows.push({ ...node, network });
                return;
            }

            Object.entries(node).forEach(([key, value]) => {
                const keyedNetwork = normalizeNetwork(key) || networkFromProviderCode(key) || network;
                visit(value, keyedNetwork || fallbackNetwork);
            });
        };
        visit(mobileNetwork);
        return rows;
    }
    if (raw && typeof raw === 'object') return Object.entries(raw).map(([network, value]) => ({ network, value }));
    return [];
}

function extractDiscount(row: any) {
    const candidate = row?.discount ?? row?.Discount ?? row?.discountPercent ?? row?.percentage ??
        row?.value ?? row?.PRODUCT ?? row?.Product ?? row?.product ?? row;
    const value = typeof candidate === 'string' ? candidate.replace('%', '') : candidate;
    const parsed = Number(typeof value === 'string' ? value.match(/\d+(\.\d+)?/)?.[0] : value);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 30) return 0;
    return parsed;
}

function bestDiscountsByNetwork(rows: any[]) {
    const best = new Map<string, any>();
    rows.forEach((row) => {
        const network = normalizeNetwork(row.network || row.Network || row.name || row.NetworkName);
        if (!network) return;
        const discount = extractDiscount(row);
        if (discount <= 0) return;
        const current = best.get(network);
        if (!current || discount > current.discount) best.set(network, { row, discount });
    });
    return best;
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
        const discounts = bestDiscountsByNetwork(rows);
        Object.entries(FALLBACK_AIRTIME_DISCOUNTS).forEach(([network, discount]) => {
            if (!discounts.has(network)) discounts.set(network, { row: { network, value: discount, fallback: true }, discount });
        });
        const batch = db.batch();
        let count = 0;
        const refs = Array.from(discounts.keys()).map((network) => db.collection('calebnet_catalog').doc(`clubkonnect_AIRTIME_${network}`));
        const existingDocs = refs.length > 0 ? await db.getAll(...refs) : [];
        const existingByNetwork = new Map(existingDocs.map((doc) => [doc.id.replace('clubkonnect_AIRTIME_', ''), doc.exists ? doc.data() : null]));

        discounts.forEach(({ row, discount }, network) => {
            const id = `clubkonnect_AIRTIME_${network}`;
            const existing = existingByNetwork.get(network);
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
                isActive: existing?.isActive === undefined ? false : !!existing.isActive,
                isFeatured: existing?.isFeatured === undefined ? false : !!existing.isFeatured,
                rawDiscount: row,
                updatedAt: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            count += 1;
        });

        if (count > 0) await batch.commit();
        return res.status(200).json({
            success: true,
            count,
            rawCount: rows.length,
            rawShape: Array.isArray(raw) ? 'array' : typeof raw,
            topLevelKeys: raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw).slice(0, 12) : [],
            sampleKeys: rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0]).slice(0, 20) : [],
        });
    } catch (error: any) {
        console.error('[CalebNet Sync Airtime Discounts]', error);
        return res.status(500).json({ error: error.message || 'Airtime discount sync failed' });
    }
}
