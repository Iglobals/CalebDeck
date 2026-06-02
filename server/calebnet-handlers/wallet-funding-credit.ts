import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { setCors, requireAdmin } from '../calebnet.js';
import { creditWallet, ensureWalletUser, WALLET_FUNDING_MAX, WALLET_FUNDING_MIN } from '../wallet.js';

async function verifyPaystack(reference: string) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error('Paystack verification is not configured');

    const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secretKey}` }, timeout: 15000 }
    );
    return response.data?.data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(401).json({ error: 'Admin access required' });

        const reference = String(req.body?.reference || '').trim();
        const userId = String(req.body?.userId || '').trim();
        if (!reference || !userId) return res.status(400).json({ error: 'Payment reference and user are required.' });

        const payment = await verifyPaystack(reference);
        if (payment?.status !== 'success') {
            return res.status(400).json({ error: 'Paystack has not confirmed this payment as successful.' });
        }

        const amount = Number(payment.amount || 0) / 100;
        if (!Number.isFinite(amount) || amount < WALLET_FUNDING_MIN || amount > WALLET_FUNDING_MAX) {
            return res.status(400).json({ error: `Wallet funding must be between ₦${WALLET_FUNDING_MIN.toLocaleString()} and ₦${WALLET_FUNDING_MAX.toLocaleString()}.` });
        }

        await ensureWalletUser(userId, {
            email: req.body?.email || payment.customer?.email || null,
            displayName: req.body?.displayName || null,
            phoneNumber: req.body?.phoneNumber || null,
        });

        const result = await creditWallet({
            userId,
            amount,
            reference,
            purpose: 'WALLET_FUNDING',
            relatedOrderId: null,
            metadataSafe: {
                source: 'admin_recovery',
                paystackStatus: payment.status,
                channel: payment.channel || null,
                paidAt: payment.paid_at || payment.paidAt || null,
                customerEmail: payment.customer?.email || null,
                recoveredBy: admin.uid,
            },
        });

        return res.status(200).json({
            success: true,
            alreadyProcessed: result.alreadyProcessed,
            balance: result.balance,
            amount,
            reference,
        });
    } catch (error: any) {
        console.error('[Wallet Funding Credit]', error);
        return res.status(500).json({ error: error.message || 'Could not verify this wallet funding.' });
    }
}
