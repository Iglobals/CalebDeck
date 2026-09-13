import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin.js';

export const WALLET_FUNDING_MIN = 100;
export const WALLET_FUNDING_MAX = 50000;

export type WalletTransactionPurpose = 'WALLET_FUNDING' | 'CALEBNET_PURCHASE' | 'CALEBNET_REFUND';

export interface FundingIntent {
    userId: string;
    amount: number;
    status: 'PENDING' | 'USED';
    createdAt?: any;
    updatedAt?: any;
}

/** Record what the user ASKED to fund, server-side, before the charge starts. */
export async function recordFundingIntent(userId: string, reference: string, amount: number) {
    const db = adminDb();
    await db.collection('wallet_funding_intents').doc(reference).set({
        userId,
        amount,
        status: 'PENDING',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Resolve the amount to credit: the server-recorded intent (what the user
 * requested) when a valid one exists, otherwise the amount Paystack reports as
 * charged. Paystack surcharges must never leak into the wallet credit, and the
 * intent is only trusted if the charge actually collected at least that amount.
 */
export async function resolveFundingAmount(
    userId: string,
    reference: string,
    chargedAmount: number
): Promise<{ amount: number; fromIntent: boolean } | null> {
    const db = adminDb();
    const snap = await db.collection('wallet_funding_intents').doc(reference).get();
    if (!snap.exists) return null;
    const intent = snap.data() as FundingIntent;
    if (intent.status !== 'PENDING') return null;
    if (String(intent.userId) !== String(userId)) return null;
    const amount = Number(intent.amount);
    if (!Number.isFinite(amount) || amount < WALLET_FUNDING_MIN || amount > WALLET_FUNDING_MAX) return null;
    if (chargedAmount + 0.001 < amount) return null;
    return { amount, fromIntent: true };
}

export async function markFundingIntentUsed(reference: string) {
    const db = adminDb();
    await db.collection('wallet_funding_intents').doc(reference).set(
        { status: 'USED', updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
    );
}

interface WalletProfile {
    email?: string;
    displayName?: string;
    phoneNumber?: string;
}

export async function ensureWalletUser(userId: string, profile: WalletProfile = {}) {
    const db = adminDb();
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) {
            tx.set(userRef, {
                role: 'STUDENT',
                isCalebNetUser: true,
                email: profile.email || null,
                displayName: profile.displayName || null,
                phoneNumber: profile.phoneNumber || null,
                walletBalance: 0,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            return;
        }

        const data = snap.data() || {};
        const patch: Record<string, any> = {
            isCalebNetUser: true,
            updatedAt: FieldValue.serverTimestamp(),
        };
        if (typeof data.walletBalance !== 'number') patch.walletBalance = 0;
        if (!data.role) patch.role = 'STUDENT';
        if (!data.email && profile.email) patch.email = profile.email;
        if (!data.displayName && profile.displayName) patch.displayName = profile.displayName;
        if (!data.phoneNumber && profile.phoneNumber) patch.phoneNumber = profile.phoneNumber;
        tx.set(userRef, patch, { merge: true });
    });
}

export async function creditWallet(params: {
    userId: string;
    amount: number;
    reference: string;
    purpose: WalletTransactionPurpose;
    relatedOrderId?: string | null;
    metadataSafe?: Record<string, any>;
}) {
    const db = adminDb();
    const txRef = db.collection('wallet_transactions').doc(params.reference);
    const userRef = db.collection('users').doc(params.userId);

    return db.runTransaction(async (tx) => {
        const existingTx = await tx.get(txRef);
        const userSnap = await tx.get(userRef);
        const userData = userSnap.exists ? userSnap.data() || {} : {};
        const currentBalance = Number(userData.walletBalance || 0);

        if (existingTx.exists) {
            return {
                alreadyProcessed: true,
                transaction: { id: txRef.id, ...existingTx.data() },
                balance: currentBalance,
            };
        }

        const nextBalance = Number((currentBalance + params.amount).toFixed(2));
        if (!userSnap.exists) {
            tx.set(userRef, {
                role: 'STUDENT',
                isCalebNetUser: true,
                walletBalance: nextBalance,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } else {
            tx.set(userRef, {
                isCalebNetUser: true,
                walletBalance: nextBalance,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        const transaction = {
            userId: params.userId,
            type: params.purpose === 'CALEBNET_REFUND' ? 'refund' : 'credit',
            amount: params.amount,
            balanceBefore: currentBalance,
            balanceAfter: nextBalance,
            reference: params.reference,
            purpose: params.purpose,
            relatedOrderId: params.relatedOrderId || null,
            status: 'SUCCESSFUL',
            metadataSafe: params.metadataSafe || {},
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };
        tx.set(txRef, transaction);

        return {
            alreadyProcessed: false,
            transaction: { id: txRef.id, ...transaction },
            balance: nextBalance,
        };
    });
}

export async function refundWalletForCalebNetOrder(params: {
    orderId: string;
    reason: string;
    fulfillmentStatus?: 'FAILED' | 'CANCELLED' | 'REFUND_REQUIRED';
}) {
    const db = adminDb();
    const orderRef = db.collection('calebnet_orders').doc(params.orderId);

    return db.runTransaction(async (tx) => {
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) throw new Error('CalebNet order not found for refund');
        const order = orderSnap.data() || {};

        if (order.paymentProvider !== 'wallet') {
            tx.set(orderRef, {
                fulfillmentStatus: params.fulfillmentStatus || 'FAILED',
                providerRemark: params.reason,
                refundedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            return { refunded: false, reason: 'non_wallet_order' };
        }

        if (order.walletRefundTransactionId) {
            return { refunded: false, reason: 'already_refunded', transactionId: order.walletRefundTransactionId };
        }

        const userId = String(order.userId || '');
        if (!userId) throw new Error('Wallet order has no userId');

        const amount = Number(order.amountPaid || order.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('Wallet refund amount is invalid');

        const refundReference = `${params.orderId}_refund`;
        const refundRef = db.collection('wallet_transactions').doc(refundReference);
        const refundSnap = await tx.get(refundRef);
        const userRef = db.collection('users').doc(userId);
        const userSnap = await tx.get(userRef);
        const balanceBefore = Number(userSnap.data()?.walletBalance || 0);

        if (refundSnap.exists) {
            tx.set(orderRef, {
                walletRefundTransactionId: refundReference,
                fulfillmentStatus: params.fulfillmentStatus || 'FAILED',
                providerRemark: params.reason,
                refundedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            return { refunded: false, reason: 'refund_transaction_exists', transactionId: refundReference };
        }

        const balanceAfter = Number((balanceBefore + amount).toFixed(2));
        tx.set(userRef, {
            walletBalance: balanceAfter,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(refundRef, {
            userId,
            type: 'refund',
            amount,
            balanceBefore,
            balanceAfter,
            reference: refundReference,
            purpose: 'CALEBNET_REFUND',
            relatedOrderId: params.orderId,
            status: 'SUCCESSFUL',
            metadataSafe: { reason: params.reason },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(orderRef, {
            walletRefundTransactionId: refundReference,
            fulfillmentStatus: params.fulfillmentStatus || 'FAILED',
            providerRemark: params.reason,
            refundedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return { refunded: true, transactionId: refundReference, balanceAfter };
    });
}
