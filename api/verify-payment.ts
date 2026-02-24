import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
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
            console.error('[verify-payment] PAYSTACK_SECRET_KEY not configured');
            return res.status(500).json({ error: 'Payment verification not configured' });
        }

        // Verify payment with Paystack API
        const paystackResponse = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const { data } = paystackResponse.data;

        if (data.status !== 'success') {
            console.warn(`[verify-payment] Payment not successful. Status: ${data.status}, Ref: ${reference}`);
            return res.status(400).json({
                error: 'Payment was not successful',
                status: data.status,
            });
        }

        // Verify amount matches (Paystack returns amount in kobo, orderData.total is in naira)
        const expectedAmountKobo = Math.round((orderData?.total || 0) * 100);
        const actualAmountKobo = data.amount;

        if (expectedAmountKobo > 0 && actualAmountKobo !== expectedAmountKobo) {
            console.warn(`[verify-payment] Amount mismatch! Expected: ${expectedAmountKobo}, Got: ${actualAmountKobo}`);
            return res.status(400).json({
                error: 'Payment amount does not match order total',
                expected: expectedAmountKobo,
                received: actualAmountKobo,
            });
        }

        console.log(`[verify-payment] ✓ Payment verified. Ref: ${reference}, Amount: ₦${data.amount / 100}`);

        return res.status(200).json({
            data: {
                success: true,
                message: 'Payment verified',
                paystackRef: data.reference,
                amount: data.amount / 100,
                paidAt: data.paid_at,
            }
        });
    } catch (error: any) {
        console.error('[verify-payment] Error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Payment verification failed' });
    }
}
