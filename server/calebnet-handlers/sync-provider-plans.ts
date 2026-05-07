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

function stringify(value: any) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return '';
}

function looksLikePlanCode(value: string) {
    return /^[0-9]+(\.[0-9]+)?$/.test(value.trim());
}

function networkFromProviderCode(value: any) {
    const code = String(value || '').trim();
    if (code === '01') return 'MTN';
    if (code === '02') return 'GLO';
    if (code === '03') return '9MOBILE';
    if (code === '04') return 'AIRTEL';
    return null;
}

const PLAN_COLLECTION_KEYS = [
    'PRODUCT', 'Product', 'product', 'PRODUCTS', 'Products', 'products',
    'PLAN', 'Plan', 'plan', 'PLANS', 'Plans', 'plans',
    'DATA', 'Data', 'data', 'CONTENT', 'Content', 'content',
];

function isPlanLike(row: any) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    if (PLAN_COLLECTION_KEYS.some((key) => row[key] && typeof row[key] === 'object')) return false;
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

function pushProductRows(products: any, groupNetwork: string, rows: any[]) {
    if (!products) return;

    if (Array.isArray(products)) {
        products.forEach((product) => pushProductRows(product, groupNetwork, rows));
        return;
    }

    if (typeof products === 'string' || typeof products === 'number') {
        rows.push({
            rawName: String(products),
            name: String(products),
            __groupNetwork: groupNetwork,
        });
        return;
    }

    if (typeof products !== 'object') return;

    const nestedProducts = pick(products, [
        'PRODUCT', 'Product', 'product', 'PRODUCTS', 'Products', 'products',
        'PLAN', 'Plan', 'plan', 'PLANS', 'Plans', 'plans',
    ]);

    const explicitPlanCode = stringify(pick(products, [
        'providerPlanCode', 'DataPlan', 'dataplan', 'dataPlan', 'planid',
        'planId', 'PlanID', 'code', 'variation_code', 'DATAPLANID',
        'DataPlanID', 'PRODUCT_ID', 'ProductID', 'productId', 'ID',
    ]));

    const productName = stringify(pick(products, [
        'rawName', 'name', 'Name', 'PlanName', 'plan_name', 'DataPlanName',
        'dataplan_name', 'description', 'Description', 'PRODUCT_NAME',
        'ProductName', 'productName', 'PRODUCT', 'product', 'Product',
    ]));

    if (explicitPlanCode && (productName || !nestedProducts || typeof nestedProducts !== 'object')) {
        rows.push({ ...products, providerPlanCode: explicitPlanCode, rawName: productName, __groupNetwork: groupNetwork });
        return;
    }

    if (nestedProducts && typeof nestedProducts === 'object') {
        pushProductRows(nestedProducts, groupNetwork, rows);
        return;
    }

    Object.entries(products).forEach(([key, value]) => {
        if (looksLikePlanCode(key)) {
            if (value && typeof value === 'object') {
                rows.push({ providerPlanCode: key, DataPlan: key, ...value, __groupNetwork: groupNetwork });
            } else {
                rows.push({ providerPlanCode: key, DataPlan: key, rawName: String(value || ''), name: String(value || ''), __groupNetwork: groupNetwork });
            }
            return;
        }

        pushProductRows(value, groupNetwork, rows);
    });
}

function rowsFromMobileNetwork(raw: any) {
    const mobileNetwork = raw?.MOBILE_NETWORK || raw?.mobile_network || raw?.MobileNetwork || raw?.networks;
    if (!mobileNetwork) return [];

    const rows: any[] = [];

    const visitNetworkNode = (node: any, fallbackNetwork = '') => {
        if (!node) return;
        if (Array.isArray(node)) {
            node.forEach((item) => visitNetworkNode(item, fallbackNetwork));
            return;
        }
        if (typeof node !== 'object') return;

        const network = networkFromProviderCode(node.ID || node.id || node.CODE || node.code) ||
            normalizeNetwork(node.NETWORK || node.Network || node.NAME || node.Name || node.name || fallbackNetwork);
        const products = node.PRODUCT || node.Product || node.product ||
            node.PRODUCTS || node.Products || node.products ||
            node.PLANS || node.Plans || node.plans ||
            node.DATA || node.Data || node.data;

        if (products && network) {
            pushProductRows(products, network, rows);
            return;
        }

        Object.entries(node).forEach(([key, value]) => {
            const keyedNetwork = normalizeNetwork(key) || networkFromProviderCode(key) || network;
            if (keyedNetwork) {
                if (Array.isArray(value)) {
                    pushProductRows(value, keyedNetwork, rows);
                    return;
                }
                if (value && typeof value === 'object') {
                    const keyedProducts = (value as any).PRODUCT || (value as any).Product || (value as any).product ||
                        (value as any).PRODUCTS || (value as any).Products || (value as any).products ||
                        (value as any).PLANS || (value as any).Plans || (value as any).plans ||
                        (value as any).DATA || (value as any).Data || (value as any).data;
                    if (keyedProducts) {
                        pushProductRows(keyedProducts, keyedNetwork, rows);
                        return;
                    }
                }
            }
            visitNetworkNode(value, keyedNetwork || fallbackNetwork);
        });
    };

    visitNetworkNode(mobileNetwork);

    return rows;
}

function normalizeRows(raw: any): any[] {
    const mobileNetworkRows = rowsFromMobileNetwork(raw);
    if (mobileNetworkRows.length > 0) return mobileNetworkRows;

    const rows: any[] = [];
    const visit = (value: any, groupNetwork = '') => {
        if (!value) return;
        if (Array.isArray(value)) {
            value.forEach((row) => {
                if (isPlanLike(row)) {
                    rows.push({ ...row, __groupNetwork: groupNetwork });
                    return;
                }
                visit(row, groupNetwork);
            });
            return;
        }
        if (typeof value !== 'object') return;

        const ownNetwork = networkFromProviderCode(pick(value, ['ID', 'id', 'MobileNetwork', 'MOBILE_NETWORK_ID', 'networkCode', 'NetworkCode'])) || normalizeNetwork(
            pick(value, ['network', 'Network', 'network_name', 'NetworkName', 'MobileNetwork', 'name', 'Name', 'MOBILENETWORK', 'MobileNetworkName']) || groupNetwork
        ) || groupNetwork;

        const nestedPlanCollectionKey = PLAN_COLLECTION_KEYS.find((key) => value[key] && typeof value[key] === 'object');
        if (nestedPlanCollectionKey) {
            visit(value[nestedPlanCollectionKey], ownNetwork);
            return;
        }

        if (isPlanLike(value)) {
            rows.push({ ...value, __groupNetwork: groupNetwork });
            return;
        }

        Object.entries(value).forEach(([key, nested]) => {
            const normalizedNetwork = normalizeNetwork(key);

            if (Array.isArray(nested)) {
                visit(nested, normalizedNetwork || ownNetwork || key);
                return;
            }

            if (nested && typeof nested === 'object') {
                if (looksLikePlanCode(key) && (ownNetwork || normalizedNetwork)) {
                    rows.push({
                        providerPlanCode: key,
                        DataPlan: key,
                        ...nested,
                        __groupNetwork: normalizedNetwork || ownNetwork,
                    });
                    return;
                }
                if (normalizedNetwork) {
                    rows.push(...rowsFromKeyedPlanObject(normalizedNetwork, nested as Record<string, any>));
                    return;
                }
                visit(nested, ownNetwork || groupNetwork || key);
                return;
            }

            if (looksLikePlanCode(key) && (ownNetwork || normalizedNetwork)) {
                rows.push({
                    providerPlanCode: key,
                    DataPlan: key,
                    rawName: String(nested || ''),
                    name: String(nested || ''),
                    __groupNetwork: normalizedNetwork || ownNetwork,
                });
            }
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
            const rawName = stringify(pick(row, [
                'rawName', 'name', 'Name', 'PlanName', 'plan_name', 'DataPlanName',
                'dataplan_name', 'plan', 'description', 'Description', 'PRODUCT_NAME',
                'ProductName', 'productName', 'PRODUCT', 'product',
            ]));
            const providerPlanCode = stringify(pick(row, [
                'providerPlanCode', 'DataPlan', 'dataplan', 'dataPlan', 'planid',
                'planId', 'PlanID', 'code', 'variation_code', 'DATAPLANID',
                'DataPlanID', 'PRODUCT_ID', 'ProductID', 'productId', 'ID',
            ]) || (looksLikePlanCode(stringify(row.ID)) && !rawName.toUpperCase().includes('MTN') && !rawName.toUpperCase().includes('GLO') && !rawName.toUpperCase().includes('AIRTEL') ? row.ID : '')).trim();
            const network = networkFromProviderCode(pick(row, ['MobileNetwork', 'MOBILE_NETWORK_ID', 'networkCode', 'NetworkCode'])) ||
                normalizeNetwork(pick(row, ['network', 'Network', 'network_name', '__groupNetwork', 'MOBILENETWORK']) || rawName);
            if (!network || !providerPlanCode) {
                skipped += 1;
                return;
            }

            const rawPrice = Number(stringify(pick(row, ['price', 'Price', 'amount', 'Amount', 'cost', 'Cost', 'plan_amount', 'rawPrice', 'PRICE', 'selling_price', 'PRODUCT_AMOUNT', 'ProductAmount'])).replace(/[^\d.]/g, ''));
            const dataSize = String(pick(row, ['dataSize', 'DataSize', 'size', 'Size', 'DATA_SIZE', 'DataSize']) || rawName.match(/\d+(\.\d+)?\s*(MB|GB|TB)/i)?.[0] || '');
            const validity = String(pick(row, ['validity', 'Validity', 'duration', 'Duration', 'VALIDITY']) || rawName.match(/\d+\s*(day|days|week|weeks|month|months)/i)?.[0] || '');
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

        ['MTN', 'GLO', 'AIRTEL', '9MOBILE'].forEach((network) => {
            batch.delete(db.collection('calebnet_provider_plans').doc(`clubkonnect_${network}_${NETWORK_CODES[network as keyof typeof NETWORK_CODES]}`));
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
