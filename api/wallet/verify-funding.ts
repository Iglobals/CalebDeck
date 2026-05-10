import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { setCors } from '../../server/calebnet.js';
import { verifyUser } from '../../server/verify-user.js';
import { creditWallet, ensureWalletUser, WALLET_FUNDING_MAX, WALLET_FUNDING_MIN } from '../../server/wallet.js';

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
        const user = await verifyUser(req);
        if (!user) return res.status(401).json({ error: 'Sign in to fund your CalebNet wallet.' });

        const reference = String(req.body?.reference || '').trim();
        if (!reference) return res.status(400).json({ error: 'Payment reference is required' });

        await ensureWalletUser(user.uid, {
            email: user.email,
            displayName: user.name,
            phoneNumber: user.phoneNumber,
        });

        const payment = await verifyPaystack(reference);
        if (payment?.status !== 'success') {
            return res.status(400).json({ error: 'Payment was not successful' });
        }

        const amount = Number(payment.amount || 0) / 100;
        if (!Number.isFinite(amount) || amount < WALLET_FUNDING_MIN || amount > WALLET_FUNDING_MAX) {
            return res.status(400).json({ error: `Wallet funding must be between ₦${WALLET_FUNDING_MIN.toLocaleString()} and ₦${WALLET_FUNDING_MAX.toLocaleString()}` });
        }

        const customerEmail = payment.customer?.email;
        if (customerEmail && user.email && String(customerEmail).toLowerCase() !== String(user.email).toLowerCase()) {
            return res.status(403).json({ error: 'This payment does not belong to the signed-in wallet.' });
        }

        const result = await creditWallet({
            userId: user.uid,
            amount,
            reference,
            purpose: 'WALLET_FUNDING',
            relatedOrderId: null,
            metadataSafe: {
                paystackStatus: payment.status,
                channel: payment.channel || null,
                paidAt: payment.paid_at || payment.paidAt || null,
                customerEmail: customerEmail || null,
            },
        });

        return res.status(200).json({
            success: true,
            alreadyProcessed: result.alreadyProcessed,
            balance: result.balance,
            transaction: result.transaction,
        });
    } catch (error: any) {
        console.error('[Wallet Verify Funding]', error);
        return res.status(500).json({ error: error.message || 'Wallet funding verification failed' });
    }
}
