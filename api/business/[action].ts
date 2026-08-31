import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../../server/firebase-admin.js';
import axios from 'axios';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

function setCorsHeaders(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Access code generator (same algo as client, duplicated here for server-side use) ──
function generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code.match(/.{1,4}/g)?.join('-') || code;
}

// ── Paystack verification ──
async function verifyPaystackPayment(reference: string) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error('Paystack is not configured');
    const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secretKey}` }, timeout: 15000 }
    );
    return response.data?.data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action } = req.query;
    const db = adminDb();

    // ═══════════════════════════════════════════════════════════════
    // ACTION: vendor-auth — authenticate vendor via access code
    // ═══════════════════════════════════════════════════════════════
    if (action === 'vendor-auth') {
        try {
            const { code } = req.body;
            if (!code || typeof code !== 'string') {
                return res.status(400).json({ error: 'Access code is required' });
            }

            // IP-based rate limiting (5 attempts per 15 minutes)
            const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
            const ipString = Array.isArray(ip) ? ip[0] : ip;
            const attemptRef = db.collection('vendor_auth_attempts').doc(ipString.replace(/[:.]/g, '_'));
            const attemptDoc = await attemptRef.get();
            const now = new Date();
            const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

            let attempts = 0;
            if (attemptDoc.exists) {
                const data = attemptDoc.data()!;
                if (data.lockedUntil && data.lockedUntil.toDate() > now) {
                    const waitMins = Math.ceil((data.lockedUntil.toDate().getTime() - now.getTime()) / 60000);
                    return res.status(429).json({ error: `Too many attempts. Try again in ${waitMins} minutes.` });
                }
                const docLastAttempt = data.lastAttempt?.toDate() || new Date(0);
                if (docLastAttempt > fifteenMinsAgo) {
                    attempts = data.attempts || 0;
                }
            }

            if (attempts >= 5) {
                const lockTime = new Date(now.getTime() + 15 * 60 * 1000);
                await attemptRef.set({
                    ip: ipString,
                    attempts: attempts + 1,
                    lastAttempt: FieldValue.serverTimestamp(),
                    lockedUntil: lockTime
                }, { merge: true });
                return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
            }

            // Look up vendor by code
            const vendorsSnap = await db.collection('business_vendors')
                .where('accessCode', '==', code.trim())
                .limit(1)
                .get();

            if (vendorsSnap.empty) {
                await attemptRef.set({
                    ip: ipString,
                    attempts: attempts + 1,
                    lastAttempt: FieldValue.serverTimestamp()
                }, { merge: true });
                return res.status(401).json({ error: 'Invalid access code', remaining: 5 - (attempts + 1) });
            }

            // Success
            if (attemptDoc.exists) await attemptRef.delete();
            const vendorData = vendorsSnap.docs[0].data();

            return res.status(200).json({
                data: {
                    vendor: {
                        id: vendorsSnap.docs[0].id,
                        vendorId: vendorData.vendorId,
                        businessName: vendorData.businessName,
                        subscriptionEndDate: vendorData.subscriptionEndDate,
                        subscriptionStartDate: vendorData.subscriptionStartDate,
                        subscriptionPlan: vendorData.subscriptionPlan,
                        category: vendorData.category,
                        status: vendorData.status || 'ACTIVE'
                    }
                }
            });
        } catch (error: any) {
            console.error('[business/vendor-auth]', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: get-vendor-referrals — server-side referral count
    // Keeps business_referrals locked to admin in Firestore rules.
    // ═══════════════════════════════════════════════════════════════
    if (action === 'get-vendor-referrals') {
        try {
            const { vendorId } = req.body;
            if (!vendorId || typeof vendorId !== 'string') {
                return res.status(400).json({ error: 'vendorId is required' });
            }

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const refsSnap = await db.collection('business_referrals')
                .where('vendorId', '==', vendorId)
                .where('timestamp', '>=', startOfMonth)
                .get();

            return res.status(200).json({ count: refsSnap.size });
        } catch (error: any) {
            console.error('[business/get-vendor-referrals]', error);
            return res.status(500).json({ error: 'Failed to fetch referrals' });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: activate-subscription — verify Paystack payment,
    // activate vendor, generate access code, set subscription dates
    // ═══════════════════════════════════════════════════════════════
    if (action === 'activate-subscription') {
        try {
            const { activationToken, reference } = req.body;
            if (!activationToken || !reference) {
                return res.status(400).json({ error: 'activationToken and payment reference are required' });
            }

            // Look up vendor by activation token
            const vendorsSnap = await db.collection('business_vendors')
                .where('activationToken', '==', activationToken)
                .limit(1)
                .get();

            if (vendorsSnap.empty) {
                return res.status(404).json({ error: 'Invalid or expired activation link' });
            }

            const vendorDoc = vendorsSnap.docs[0];
            const vendorData = vendorDoc.data();

            // Check if already active (prevent double-payment)
            if (vendorData.status === 'ACTIVE') {
                return res.status(400).json({ error: 'This vendor is already activated' });
            }

            // Verify Paystack payment
            const payment = await verifyPaystackPayment(reference);
            if (payment?.status !== 'success') {
                return res.status(400).json({ error: 'Payment was not successful' });
            }

            // Determine plan duration from the stored plan
            const plan = vendorData.subscriptionPlan || '';
            const isYearly = plan.toLowerCase().includes('year');
            const durationDays = isYearly ? 365 : 30;
            const expectedAmountKobo = isYearly ? 24999 * 100 : 2999 * 100;

            // Verify amount matches (with 1% tolerance for rounding)
            const paidAmount = Number(payment.amount || 0);
            if (paidAmount < expectedAmountKobo * 0.99) {
                return res.status(400).json({ error: `Payment amount does not match the ${isYearly ? 'Yearly' : 'Monthly'} plan price` });
            }

            // All good — activate
            const now = new Date();
            const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
            const accessCode = generateAccessCode();

            await vendorDoc.ref.update({
                status: 'ACTIVE',
                accessCode,
                accessCodePlain: accessCode,
                subscriptionStartDate: now,
                subscriptionEndDate: endDate,
                activatedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });

            // Log the subscription payment
            await db.collection('vendor_subscription_payments').add({
                vendorId: vendorDoc.id,
                vendorBusinessName: vendorData.businessName,
                vendorDocId: vendorData.vendorId,
                plan: vendorData.subscriptionPlan,
                amount: paidAmount / 100,
                paystackReference: reference,
                paystackStatus: payment.status,
                channel: payment.channel || null,
                paidAt: payment.paid_at || null,
                customerEmail: payment.customer?.email || null,
                subscriptionStartDate: now,
                subscriptionEndDate: endDate,
                type: 'ACTIVATION',
                createdAt: FieldValue.serverTimestamp()
            });

            return res.status(200).json({
                success: true,
                accessCode,
                subscriptionEndDate: endDate.toISOString(),
                businessName: vendorData.businessName
            });
        } catch (error: any) {
            console.error('[business/activate-subscription]', error);
            return res.status(500).json({ error: error.message || 'Activation failed' });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: renew-subscription — for existing vendors to extend
    // ═══════════════════════════════════════════════════════════════
    if (action === 'renew-subscription') {
        try {
            const { vendorDocId, reference, plan } = req.body;
            if (!vendorDocId || !reference || !plan) {
                return res.status(400).json({ error: 'vendorDocId, reference, and plan are required' });
            }

            const vendorRef = db.collection('business_vendors').doc(vendorDocId);
            const vendorDoc = await vendorRef.get();
            if (!vendorDoc.exists) {
                return res.status(404).json({ error: 'Vendor not found' });
            }

            const vendorData = vendorDoc.data()!;

            // Verify payment
            const payment = await verifyPaystackPayment(reference);
            if (payment?.status !== 'success') {
                return res.status(400).json({ error: 'Payment was not successful' });
            }

            const isYearly = plan.toLowerCase().includes('year');
            const durationDays = isYearly ? 365 : 30;
            const expectedAmountKobo = isYearly ? 24999 * 100 : 2999 * 100;

            const paidAmount = Number(payment.amount || 0);
            if (paidAmount < expectedAmountKobo * 0.99) {
                return res.status(400).json({ error: 'Payment amount does not match the selected plan' });
            }

            // Calculate new end date (extend from current end if still active, or from now if expired)
            const now = new Date();
            let currentEnd: Date;
            try {
                currentEnd = vendorData.subscriptionEndDate?.toDate ? vendorData.subscriptionEndDate.toDate() : new Date(vendorData.subscriptionEndDate);
            } catch {
                currentEnd = now;
            }
            const startFrom = currentEnd > now ? currentEnd : now;
            const newEndDate = new Date(startFrom.getTime() + durationDays * 24 * 60 * 60 * 1000);

            await vendorRef.update({
                status: 'ACTIVE',
                subscriptionPlan: plan,
                subscriptionEndDate: newEndDate,
                renewedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });

            // Log renewal payment
            await db.collection('vendor_subscription_payments').add({
                vendorId: vendorDoc.id,
                vendorBusinessName: vendorData.businessName,
                vendorDocId: vendorData.vendorId,
                plan,
                amount: paidAmount / 100,
                paystackReference: reference,
                paystackStatus: payment.status,
                channel: payment.channel || null,
                paidAt: payment.paid_at || null,
                customerEmail: payment.customer?.email || null,
                subscriptionStartDate: startFrom,
                subscriptionEndDate: newEndDate,
                type: 'RENEWAL',
                createdAt: FieldValue.serverTimestamp()
            });

            return res.status(200).json({
                success: true,
                subscriptionEndDate: newEndDate.toISOString(),
                plan
            });
        } catch (error: any) {
            console.error('[business/renew-subscription]', error);
            return res.status(500).json({ error: error.message || 'Renewal failed' });
        }
    }

    return res.status(404).json({ error: 'Unknown action' });
}
