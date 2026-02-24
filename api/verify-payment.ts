import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import axios from 'axios';

// Inline Firebase Admin init (Vercel isolates each function — no shared modules)
if (!admin.apps.length) {
    const projectId = process.env.FB_SA_PROJECT_ID;
    const clientEmail = process.env.FB_SA_CLIENT_EMAIL;
    let privateKey = process.env.FB_SA_PRIVATE_KEY || '';
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
        admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { reference, orderData } = req.body;

        if (!reference) {
            return res.status(400).json({ error: 'Payment reference is required' });
        }

        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!secretKey) {
            return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY not configured on Vercel' });
        }

        const paystackResponse = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            { headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' } }
        );

        const { data } = paystackResponse.data;

        if (data.status !== 'success') {
            return res.status(400).json({ error: 'Payment was not successful', status: data.status });
        }

        // Verify amount matches (Paystack = kobo, orderData.total = naira)
        const expectedKobo = Math.round((orderData?.total || 0) * 100);
        const actualKobo = data.amount;
        if (expectedKobo > 0 && actualKobo !== expectedKobo) {
            return res.status(400).json({ error: 'Amount mismatch', expected: expectedKobo, received: actualKobo });
        }

        return res.status(200).json({
            data: { success: true, message: 'Payment verified', paystackRef: data.reference, amount: data.amount / 100, paidAt: data.paid_at }
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Payment verification failed', details: error.response?.data || error.message });
    }
}
