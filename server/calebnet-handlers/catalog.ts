import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin.js';
import { normalizeNetwork, normalizeType, requireAdmin, setCors } from '../calebnet.js';

const VALID_CATEGORIES = ['SME', 'DIRECT', 'AWOOF', 'NIGHT', 'WEEKEND', 'AIRTIME'];

function publicPlan(doc: FirebaseFirestore.QueryDocumentSnapshot) {
    const data = doc.data();
    return {
        id: doc.id,
        type: data.type,
        network: data.network,
        name: data.name || data.displayName,
        displayName: data.displayName || data.name,
        description: data.description || '',
        validity: data.validity || null,
        dataSize: data.dataSize || null,
        sellingPrice: Number(data.sellingPrice || 0),
        category: data.category,
        isFeatured: !!data.isFeatured,
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'GET, POST, PATCH, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const db = adminDb();

        if (req.method === 'GET') {
            const type = normalizeType(req.query.type);
            const network = normalizeNetwork(req.query.network);
            if (!type || !network) return res.status(400).json({ error: 'Valid type and network are required' });

            const snapshot = await db.collection('calebnet_catalog')
                .where('type', '==', type)
                .where('network', '==', network)
                .where('isActive', '==', true)
                .limit(30)
                .get();

            const plans = snapshot.docs
                .map(publicPlan)
                .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sellingPrice - b.sellingPrice);

            return res.status(200).json({ success: true, plans });
        }

        const admin = await requireAdmin(req);
        if (!admin) return res.status(401).json({ error: 'Admin access required' });

        if (req.method === 'POST') {
            const body = req.body || {};
            const type = normalizeType(body.type);
            const network = normalizeNetwork(body.network);
            const sellingPrice = Number(body.sellingPrice);
            const providerCost = Number(body.providerCost || 0);
            const category = String(body.category || (type === 'AIRTIME' ? 'AIRTIME' : '')).toUpperCase();

            if (!type || !network) return res.status(400).json({ error: 'Valid type and network are required' });
            if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) return res.status(400).json({ error: 'Selling price must be greater than zero' });
            if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
            if (type === 'DATA' && !body.providerPlanCode) return res.status(400).json({ error: 'Data plans require providerPlanCode' });

            const docRef = body.id
                ? db.collection('calebnet_catalog').doc(String(body.id))
                : db.collection('calebnet_catalog').doc();

            const doc = {
                id: docRef.id,
                type,
                network,
                name: body.name || body.displayName || `${network} ${type === 'AIRTIME' ? 'Airtime' : 'Data'}`,
                displayName: body.displayName || body.name || '',
                description: body.description || '',
                validity: type === 'AIRTIME' ? null : (body.validity || null),
                dataSize: type === 'AIRTIME' ? null : (body.dataSize || null),
                sellingPrice,
                providerCost,
                profit: Number((sellingPrice - providerCost).toFixed(2)),
                provider: 'clubkonnect',
                providerPlanCode: type === 'AIRTIME' ? null : String(body.providerPlanCode),
                providerNetworkCode: body.providerNetworkCode || '',
                category,
                airtimeDiscountPercent: body.airtimeDiscountPercent === undefined ? null : Number(body.airtimeDiscountPercent),
                isActive: !!body.isActive,
                isFeatured: !!body.isFeatured,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };

            await docRef.set(doc, { merge: true });
            return res.status(200).json({ success: true, plan: { ...doc, createdAt: null, updatedAt: null } });
        }

        if (req.method === 'PATCH') {
            const { id, updates = {} } = req.body || {};
            if (!id) return res.status(400).json({ error: 'Catalog id is required' });

            const allowed = [
                'name', 'displayName', 'description', 'validity', 'dataSize', 'sellingPrice',
                'providerCost', 'providerPlanCode', 'providerNetworkCode', 'category',
                'airtimeDiscountPercent', 'isActive', 'isFeatured'
            ];
            const patch: Record<string, any> = {};
            allowed.forEach((key) => {
                if (updates[key] !== undefined) patch[key] = updates[key];
            });
            if (patch.sellingPrice !== undefined) patch.sellingPrice = Number(patch.sellingPrice);
            if (patch.providerCost !== undefined) patch.providerCost = Number(patch.providerCost);
            if (patch.sellingPrice !== undefined || patch.providerCost !== undefined) {
                const current = await db.collection('calebnet_catalog').doc(String(id)).get();
                const data = current.data() || {};
                const selling = patch.sellingPrice ?? Number(data.sellingPrice || 0);
                const cost = patch.providerCost ?? Number(data.providerCost || 0);
                patch.profit = Number((selling - cost).toFixed(2));
            }
            patch.updatedAt = FieldValue.serverTimestamp();

            await db.collection('calebnet_catalog').doc(String(id)).set(patch, { merge: true });
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('[CalebNet Catalog]', error);
        return res.status(500).json({ error: error.message || 'Catalog request failed' });
    }
}
