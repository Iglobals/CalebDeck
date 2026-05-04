import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';

// Init Firebase Admin
if (getApps().length === 0) {
    const projectId = process.env.FB_SA_PROJECT_ID;
    const clientEmail = process.env.FB_SA_CLIENT_EMAIL;
    let privateKey = process.env.FB_SA_PRIVATE_KEY || '';
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
        initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    }
}

const db = getApps().length > 0 ? getFirestore() : null;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';
const VTPASS_TIMEOUT = 15000;

function mapRequeryStatus(code: string): string {
    switch (code) {
        case '000': return 'SUCCESSFUL';
        case '099': return 'PENDING_PROVIDER';
        case '016': return 'REFUND_REQUIRED'; // Insufficient balance
        case '009': return 'PENDING_PROVIDER'; // Duplicate — still pending
        default: return 'REFUND_REQUIRED';
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        if (!db) return res.status(500).json({ error: 'Server not configured' });

        const { reference } = req.body;
        if (!reference || typeof reference !== 'string') {
            return res.status(400).json({ error: 'Order reference is required' });
        }

        const orderRef = db.collection('calebnet_orders').doc(reference);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });

        const orderData = orderDoc.data()!;

        // Only requery orders that are actually pending
        if (orderData.fulfillmentStatus === 'SUCCESSFUL') {
            return res.status(200).json({ success: true, status: 'SUCCESSFUL', message: 'Already delivered successfully' });
        }

        if (!orderData.providerReference) {
            return res.status(400).json({ error: 'No provider reference found for this order. Cannot requery.' });
        }

        const VTPASS_BASE_URL = process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com/api';
        const apiKey = process.env.VTPASS_API_KEY || '';
        const vtpassSecret = process.env.VTPASS_SECRET || '';

        let vtpassRes;
        try {
            vtpassRes = await axios.post(`${VTPASS_BASE_URL}/requery`, {
                request_id: orderData.providerReference
            }, {
                headers: {
                    'api-key': apiKey,
                    'secret-key': vtpassSecret,
                },
                timeout: VTPASS_TIMEOUT,
            });
        } catch (e: any) {
            const isTimeout = e.code === 'ECONNABORTED';
            console.error('[CalebNet Requery] VTpass error:', isTimeout ? 'TIMEOUT' : e.response?.data || e.message);
            return res.status(502).json({
                error: isTimeout
                    ? 'Provider took too long to respond. Try again in a few minutes.'
                    : 'Unable to reach provider. Try again later.'
            });
        }

        const vtData = vtpassRes.data;
        const newStatus = mapRequeryStatus(vtData.code);

        await orderRef.update({
            fulfillmentStatus: newStatus,
            providerResponse: vtData,
            lastRequeriedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        return res.status(200).json({
            success: true,
            status: newStatus,
            message: newStatus === 'SUCCESSFUL'
                ? 'Recharge confirmed as delivered!'
                : newStatus === 'PENDING_PROVIDER'
                    ? 'Still processing with the network. Try again later.'
                    : 'Provider reports failure. Consider retry or refund.',
            data: vtData
        });

    } catch (err: any) {
        console.error('[CalebNet Requery] Unhandled error:', err.message);
        return res.status(500).json({ error: 'Internal error during requery' });
    }
}
