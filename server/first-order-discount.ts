import type { firestore } from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
    FIRST_ORDER_DISCOUNT_COLLECTION,
    computeFirstOrderDiscountAmount,
    firstOrderDiscountMessage,
    firstOrderDiscountOrderFields,
    hasIcaAccount,
    readFirstOrderDiscountSettings,
} from '../src/services/firstOrderDiscount.js';
import { resolveOrderVertical } from '../src/services/orderVertical.js';

export interface FirstOrderDiscountEvaluation {
    applied: boolean;
    amount: number;
    percentOff: number;
    maxOrders: number;
    slotNumber: number;
    remaining: number;
    message: string;
    studentName?: string;
    email?: string;
}

const NOT_APPLIED: FirstOrderDiscountEvaluation = {
    applied: false,
    amount: 0,
    percentOff: 0,
    maxOrders: 0,
    slotNumber: 0,
    remaining: 0,
    message: '',
};

function settingsRef(db: firestore.Firestore) {
    return db.collection('settings').doc('platform');
}

function claimRef(db: firestore.Firestore, userId: string) {
    return db.collection(FIRST_ORDER_DISCOUNT_COLLECTION).doc(userId);
}

function userRef(db: firestore.Firestore, userId: string) {
    return db.collection('users').doc(userId);
}

export function isFoodOrderForDiscount(orderData: any): boolean {
    return resolveOrderVertical(orderData) === 'FOOD';
}

/**
 * Reads (settings + claim, and user if not already provided) then evaluates.
 * Must be called before any writes in the same transaction.
 */
export async function evaluateFirstOrderDiscountTx(
    t: firestore.Transaction,
    db: firestore.Firestore,
    opts: {
        userId?: string | null;
        userData?: any;
        netDeliveryFee: number;
        isFood: boolean;
    }
): Promise<FirstOrderDiscountEvaluation> {
    const userId = String(opts.userId || '').trim();
    if (!opts.isFood || !userId) return NOT_APPLIED;

    const settingsSnap = await t.get(settingsRef(db));
    const cfg = readFirstOrderDiscountSettings(settingsSnap.exists ? settingsSnap.data() : {});
    if (!cfg.enabled || cfg.percentOff <= 0 || cfg.maxOrders <= 0) return NOT_APPLIED;
    if (cfg.claimedCount >= cfg.maxOrders) return NOT_APPLIED;

    let userData = opts.userData;
    if (!userData) {
        const userSnap = await t.get(userRef(db, userId));
        if (!userSnap.exists) return NOT_APPLIED;
        userData = userSnap.data();
    }

    if (!hasIcaAccount(userData)) return NOT_APPLIED;
    if (userData?.firstOrderDiscountClaimed === true) return NOT_APPLIED;

    const existingClaim = await t.get(claimRef(db, userId));
    if (existingClaim.exists) return NOT_APPLIED;

    const amount = computeFirstOrderDiscountAmount(opts.netDeliveryFee, cfg.percentOff);
    if (amount <= 0) return NOT_APPLIED;

    const slotNumber = cfg.claimedCount + 1;
    return {
        applied: true,
        amount,
        percentOff: cfg.percentOff,
        maxOrders: cfg.maxOrders,
        slotNumber,
        remaining: Math.max(0, cfg.maxOrders - slotNumber),
        message: firstOrderDiscountMessage(cfg.percentOff, cfg.maxOrders),
        studentName: userData?.fullName || userData?.displayName || '',
        email: userData?.email || '',
    };
}

export function writeFirstOrderDiscountClaim(
    t: firestore.Transaction,
    db: firestore.Firestore,
    opts: {
        userId: string;
        orderId: string;
        evaluation: FirstOrderDiscountEvaluation;
        studentName?: string;
        email?: string;
        paymentReference?: string;
        skipUserWrite?: boolean;
    }
) {
    if (!opts.evaluation.applied) return;

    t.set(claimRef(db, opts.userId), {
        userId: opts.userId,
        orderId: opts.orderId,
        paymentReference: opts.paymentReference || null,
        studentName: opts.studentName || opts.evaluation.studentName || '',
        email: opts.email || opts.evaluation.email || '',
        percentOff: opts.evaluation.percentOff,
        amount: opts.evaluation.amount,
        slotNumber: opts.evaluation.slotNumber,
        maxOrders: opts.evaluation.maxOrders,
        claimedAt: FieldValue.serverTimestamp(),
    });

    t.set(
        settingsRef(db),
        { firstOrderDiscountClaimedCount: FieldValue.increment(1) },
        { merge: true }
    );

    if (!opts.skipUserWrite) {
        t.set(
            userRef(db, opts.userId),
            { firstOrderDiscountClaimed: true, firstOrderDiscountClaimedAt: FieldValue.serverTimestamp() },
            { merge: true }
        );
    }
}

/** Standalone claim for verify-payment / webhook (owns its own transaction). */
export async function claimFirstOrderDiscount(
    db: firestore.Firestore,
    opts: {
        userId?: string | null;
        userData?: any;
        orderId: string;
        netDeliveryFee: number;
        isFood: boolean;
        studentName?: string;
        email?: string;
        paymentReference?: string;
    }
): Promise<FirstOrderDiscountEvaluation> {
    return db.runTransaction(async (t) => {
        const evaluation = await evaluateFirstOrderDiscountTx(t, db, opts);
        if (evaluation.applied && opts.userId) {
            writeFirstOrderDiscountClaim(t, db, {
                userId: String(opts.userId),
                orderId: opts.orderId,
                evaluation,
                studentName: opts.studentName,
                email: opts.email,
                paymentReference: opts.paymentReference,
            });
        }
        return evaluation;
    });
}

export function mergeDiscountOntoOrder(orderDoc: any, evaluation: FirstOrderDiscountEvaluation) {
    if (!evaluation.applied) return orderDoc;
    const fields = firstOrderDiscountOrderFields(evaluation, orderDoc.breakdown);
    return { ...orderDoc, ...fields };
}
