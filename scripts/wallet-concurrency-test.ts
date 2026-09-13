/**
 * REAL concurrent wallet transaction test.
 *
 * Drives the production server/wallet.ts creditWallet implementation (a Firestore
 * runTransaction) against the live Firestore database using throwaway documents,
 * then replicates the pay-order debit transaction (the same read-check-write
 * pattern) under concurrency.
 *
 * Scenarios:
 *  A. 8 concurrent credits with the SAME reference  -> credited exactly once.
 *  B. 6 concurrent credits with DISTINCT references -> every credit lands (no lost updates).
 *  C. 2 concurrent debits of the full balance       -> exactly one succeeds (no double-spend).
 *
 * Run:  npx tsx scripts/wallet-concurrency-test.ts
 * (loads .env for FB_SA_* credentials; cleans up all test documents)
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env before importing firebase-admin (which reads FB_SA_* at init time).
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && process.env[m[1]] === undefined) {
            process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
        }
    }
}

import { FieldValue } from 'firebase-admin/firestore';
import { creditWallet } from '../server/wallet.js';

const CREDIT = 100;
const DEBIT = 5000;

async function main() {
    const runId = `test-conc-${Date.now()}`;
    const testUserId = `users/${runId}`.split('/')[1];
    const { adminDb } = await import('../server/firebase-admin.js');
    const db = adminDb();
    const userRef = db.collection('users').doc(testUserId);

    await userRef.set({ walletBalance: 0, isTestDoc: true, createdAt: FieldValue.serverTimestamp() });
    console.log(`\n=== Wallet Concurrency Test (user: ${testUserId}) ===\n`);

    let pass = 0, fail = 0;
    const check = (name: string, ok: boolean, detail: string) => {
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`);
        ok ? pass++ : fail++;
    };

    // ── A. Same-reference concurrent credits: idempotency ──
    const refA = `${runId}-same-ref`;
    const resultsA = await Promise.allSettled(
        Array.from({ length: 8 }, () =>
            creditWallet({ userId: testUserId, amount: CREDIT, reference: refA, purpose: 'WALLET_FUNDING' }))
    );
    const balA = (await userRef.get()).data()?.walletBalance ?? -1;
    const processedA = resultsA.filter(r =>
        r.status === 'fulfilled' && !(r.value as any).alreadyProcessed).length;
    check('A: same-ref ×8', balA === CREDIT && processedA === 1,
        `balance=₦${balA} (expected ₦${CREDIT}), freshCredits=${processedA} (expected 1)`);

    // ── B. Distinct-reference concurrent credits: no lost updates ──
    const resultsB = await Promise.allSettled(
        Array.from({ length: 6 }, (_, i) =>
            creditWallet({ userId: testUserId, amount: CREDIT, reference: `${runId}-multi-${i}`, purpose: 'WALLET_FUNDING' }))
    );
    const balB = (await userRef.get()).data()?.walletBalance ?? -1;
    const fulfilledB = resultsB.filter(r => r.status === 'fulfilled').length;
    check('B: distinct-ref ×6', balB === CREDIT + 6 * CREDIT && fulfilledB === 6,
        `balance=₦${balB} (expected ₦${CREDIT + 6 * CREDIT}), fulfilled=${fulfilledB}/6`);

    // ── C. Concurrent debits of the full balance (pay-order pattern) ──
    // Bring the balance to exactly DEBIT, then race two full-balance debits using
    // the same read-check-write transaction shape as api/wallet pay-order.
    await userRef.set({ walletBalance: DEBIT }, { merge: true });
    const debitTx = async (orderId: string) => {
        return db.runTransaction(async (t) => {
            const snap = await t.get(userRef);
            const balance = Number(snap.data()?.walletBalance || 0);
            if (balance < DEBIT) throw new Error('Insufficient wallet balance');
            t.update(userRef, { walletBalance: balance - DEBIT });
            t.set(db.collection('wallet_transactions').doc(orderId), {
                userId: testUserId, type: 'debit', amount: DEBIT,
                purpose: 'MART_PURCHASE', status: 'successful', reference: orderId,
                createdAt: FieldValue.serverTimestamp(),
            });
            return { orderId };
        });
    };
    const settle = await Promise.allSettled([
        debitTx(`${runId}-debit-1`),
        debitTx(`${runId}-debit-2`),
    ]);
    const succeededDebits = settle.filter(r => r.status === 'fulfilled').length;
    const balC = (await userRef.get()).data()?.walletBalance ?? -1;
    check('C: double-spend ×2', succeededDebits === 1 && balC === 0,
        `succeeded=${succeededDebits} (expected 1), finalBalance=₦${balC} (expected ₦0)`);

    // ── Cleanup ──
    const txs = await db.collection('wallet_transactions')
        .where('userId', '==', testUserId).get();
    for (const doc of txs.docs) await doc.ref.delete();
    await userRef.delete();
    console.log(`\nCleanup: removed test user + ${txs.size} transaction docs.\n`);

    console.log(`=== RESULT: ${pass} passed, ${fail} failed ===`);
    process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
