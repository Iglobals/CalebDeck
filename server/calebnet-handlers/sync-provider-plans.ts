import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin.js';
import { clubkonnectGet, getClubkonnectConfig, NETWORK_CODES, normalizeNetwork, requireAdmin, setCors } from '../calebnet.js';

function inferCategory(text: string) {
    const value = text.toUpperCase();
    if (value.includes('NIGHT')) return 'NIGHT';
    if (value.includes('WEEKEND')) return 'WEEKEND';
    if (value.includes('AWOOF') || value.includes('AWUF')) return 'AWOOF';
    if (value.includes('DIRECT') || value.includes('GIFTING')) return 'DIRECT';
    return 'SME';
}

function pick(row: any, keys: string[]) {
    for (const key of keys) {
        if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') return row[key];
    }
    return null;
}

function isPlanLike(row: any) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    return !!pick(row, [
        'DataPlan', 'dataplan', 'dataPlan', 'planid', 'planId', 'PlanID',
        'code', 'variation_code', 'id', 'ID',
    ]) || !!pick(row, [
        'name', 'Name', 'PlanName', 'plan_name', 'DataPlanName', 'dataplan_name',
        'dataplan', 'plan', 'PRODUCT', 'product', 'Product',
    ]);
}

function rowsFromKeyedPlanObject(groupNetwork: string, value: Record<string, any>) {
    return Object.entries(value).flatMap(([providerPlanCode, planValue]) => {
        if (Array.isArray(planValue)) {
            return planValue.map((row) => ({ ...row, __groupNetwork: groupNetwork }));
        }
        if (planValue && typeof planValue === 'object') {
            return [{ providerPlanCode, DataPlan: providerPlanCode, ...planValue, __groupNetwork: groupNetwork }];
        }
        return [{
            providerPlanCode,
            DataPlan: providerPlanCode,
            rawName: String(planValue || ''),
            name: String(planValue || ''),
            __groupNetwork: groupNetwork,
        }];
    });
}

function normalizeRows(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.plans)) return raw.plans;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.content)) return raw.content;

    const rows: any[] = [];
    const visit = (value: any, groupNetwork = '') => {
        if (!value) return;
        if (Array.isArray(value)) {
            value.forEach((row) => {
                if (row && typeof row === 'object') {
                    rows.push({ ...row, __groupNetwork: groupNetwork });
                }
            });
            return;
        }
        if (typeof value !== 'object') return;
        if (isPlanLike(value)) {
            rows.push({ ...value, __groupNetwork: groupNetwork });
            return;
        }
        Object.entries(value).forEach(([key, nested]) => {
            const normalizedNetwork = normalizeNetwork(key);
            if (normalizedNetwork && nested && typeof nested === 'object' && !Array.isArray(nested)) {
                rows.push(...rowsFromKeyedPlanObject(normalizedNetwork, nested as Record<string, any>));
                return;
            }
            visit(nested, normalizedNetwork || groupNetwork || key);
        });
    };

    visit(raw);
    if (rows.length > 0) return rows;

    if (raw && typeof raw === 'object') {
        return Object.entries(raw).flatMap(([groupNetwork, value]: [string, any]) => {
            if (!Array.isArray(value)) return [];
            return value.map((row) => ({ ...row, __groupNetwork: groupNetwork }));
        });
    }
    return [];
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
        const raw = await clubkonnectGet('/APIDatabundlePlansV2.asp', { UserID: userId }, 30000);
        const rows = normalizeRows(raw);
        const batch = db.batch();
        let count = 0;
        let skipped = 0;

        rows.forEach((row) => {
            const rawName = String(pick(row, ['rawName', 'name', 'Name', 'PlanName', 'plan_name', 'DataPlanName', 'dataplan_name', 'dataplan', 'plan', 'PRODUCT', 'product', 'Product']) || '');
            const providerPlanCode = String(pick(row, ['providerPlanCode', 'DataPlan', 'dataplan', 'dataPlan', 'planid', 'planId', 'PlanID', 'code', 'variation_code', 'id', 'ID']) || '').trim();
            const network = normalizeNetwork(pick(row, ['network', 'Network', 'MobileNetwork', 'network_name', '__groupNetwork']) || rawName);
            if (!network || !providerPlanCode) {
                skipped += 1;
                return;
            }

            const rawPrice = Number(String(pick(row, ['price', 'Price', 'amount', 'Amount', 'cost', 'Cost', 'plan_amount', 'rawPrice', 'PRICE']) || 0).replace(/[^\d.]/g, ''));
            const dataSize = String(pick(row, ['dataSize', 'DataSize', 'size', 'Size']) || rawName.match(/\d+(\.\d+)?\s*(MB|GB|TB)/i)?.[0] || '');
            const validity = String(pick(row, ['validity', 'Validity', 'duration', 'Duration']) || rawName.match(/\d+\s*(day|days|week|weeks|month|months)/i)?.[0] || '');
            const category = inferCategory(String(pick(row, ['category', 'Category']) || rawName));
            const id = `clubkonnect_${network}_${providerPlanCode.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

            batch.set(db.collection('calebnet_provider_plans').doc(id), {
                id,
                provider: 'clubkonnect',
                network,
                providerPlanCode,
                providerNetworkCode: NETWORK_CODES[network],
                rawName,
                rawPrice,
                dataSize: dataSize || null,
                validity: validity || null,
                category,
                raw,
                lastSyncedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            count += 1;
        });

        if (count > 0) await batch.commit();
        return res.status(200).json({
            success: true,
            count,
            rawCount: rows.length,
            skipped,
            rawShape: Array.isArray(raw) ? 'array' : typeof raw,
            topLevelKeys: raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw).slice(0, 12) : [],
            sampleKeys: rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0]).slice(0, 20) : [],
        });
    } catch (error: any) {
        console.error('[CalebNet Sync Provider Plans]', error);
        return res.status(500).json({ error: error.message || 'Provider plan sync failed' });
    }
}
