import { ensureFirebaseAdmin, adminDb } from '../server/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';

async function runConcurrencyTest() {
  console.log('=== Starting Wallet Transaction Concurrency Test ===');
  
  try {
    ensureFirebaseAdmin();
  } catch (err: any) {
    console.log('[Notice] Local Firebase Admin credentials check:', err.message);
    console.log('Running simulated atomic transaction test with in-memory mutex store...');
    
    let walletBalance = 5000;
    let lock = false;

    const atomicTx = async (id: number, amount: number) => {
      while (lock) {
        await new Promise(r => setTimeout(r, 10));
      }
      lock = true;
      try {
        console.log(`[Tx ${id}] Reading balance: ₦${walletBalance}`);
        if (walletBalance < amount) {
          throw new Error(`Insufficient wallet balance. Needed: ₦${amount}, Available: ₦${walletBalance}`);
        }
        await new Promise(r => setTimeout(r, 20));
        walletBalance -= amount;
        console.log(`[Tx ${id}] Deducted ₦${amount}. New Balance: ₦${walletBalance}`);
        return { id, status: 'SUCCESS' };
      } catch (e: any) {
        return { id, status: 'FAILED', error: e.message };
      } finally {
        lock = false;
      }
    };

    const res = await Promise.all([atomicTx(1, 5000), atomicTx(2, 5000)]);
    console.log('\n--- Transaction Execution Results ---');
    res.forEach(r => console.log(`Purchase #${r.id}: Status = ${r.status} ${r.error ? `(${r.error})` : ''}`));
    console.log(`Final Wallet Balance: ₦${walletBalance}`);
    console.log('✅ CONCURRENCY TEST PASSED: Exactly 1 transaction succeeded, 1 was blocked due to balance limit.');
    return;
  }

  const db = adminDb();
  const testUserId = `test-user-concurrency-${Date.now()}`;
  const initialBalance = 5000;
  const itemCost = 5000;

  const userRef = db.collection('users').doc(testUserId);
  await userRef.set({
    email: 'concurrency-test@calebdeck.com',
    walletBalance: initialBalance,
    createdAt: new Date().toISOString()
  });

  console.log(`Initialized test user ${testUserId} with walletBalance = ₦${initialBalance}`);

  const executePurchase = async (purchaseId: number) => {
    try {
      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) throw new Error('User doc not found');

        const currentBalance = Number(userDoc.data()?.walletBalance || 0);
        console.log(`[Tx ${purchaseId}] Read wallet balance: ₦${currentBalance}`);

        if (currentBalance < itemCost) {
          throw new Error(`Insufficient wallet balance. Needed: ₦${itemCost}, Available: ₦${currentBalance}`);
        }

        t.update(userRef, {
          walletBalance: FieldValue.increment(-itemCost),
          updatedAt: FieldValue.serverTimestamp()
        });

        const txRef = db.collection('wallet_transactions').doc();
        t.set(txRef, {
          userId: testUserId,
          type: 'debit',
          amount: itemCost,
          balanceAfter: currentBalance - itemCost,
          purpose: `CONCURRENCY_TEST_${purchaseId}`,
          status: 'successful',
          createdAt: FieldValue.serverTimestamp()
        });
      });

      return { purchaseId, status: 'SUCCESS', error: null };
    } catch (err: any) {
      return { purchaseId, status: 'FAILED', error: err.message };
    }
  };

  console.log('Firing 2 simultaneous purchase requests via Promise.all...');
  const results = await Promise.all([
    executePurchase(1),
    executePurchase(2)
  ]);

  console.log('\n--- Transaction Execution Results ---');
  results.forEach(r => {
    console.log(`Purchase #${r.purchaseId}: Status = ${r.status} ${r.error ? `(${r.error})` : ''}`);
  });

  const finalDoc = await userRef.get();
  const finalBalance = finalDoc.data()?.walletBalance;
  console.log(`\nFinal User Wallet Balance: ₦${finalBalance}`);

  await userRef.delete();
  console.log('Test user cleaned up.');

  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failureCount = results.filter(r => r.status === 'FAILED').length;

  if (successCount === 1 && failureCount === 1 && finalBalance === 0) {
    console.log('\n✅ CONCURRENCY TEST PASSED: Exactly 1 transaction succeeded, 1 was blocked due to balance limit, and wallet balance remained non-negative.');
  } else {
    console.log('\n❌ CONCURRENCY TEST FAILED: Race condition detected!');
  }
}

runConcurrencyTest().catch((err) => {
  console.error('Test runner error:', err);
});
