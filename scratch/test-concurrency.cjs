async function runConcurrencyTest() {
  console.log('=== Starting Wallet Transaction Concurrency Test ===');
  
  let walletBalance = 5000;
  let lock = false;

  const atomicTx = async (id, amount) => {
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
    } catch (e) {
      return { id, status: 'FAILED', error: e.message };
    } finally {
      lock = false;
    }
  };

  console.log('Firing 2 simultaneous purchase requests via Promise.all...');
  const results = await Promise.all([atomicTx(1, 5000), atomicTx(2, 5000)]);
  console.log('\n--- Transaction Execution Results ---');
  results.forEach(r => console.log(`Purchase #${r.id}: Status = ${r.status} ${r.error ? `(${r.error})` : ''}`));
  console.log(`Final Wallet Balance: ₦${walletBalance}`);

  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failureCount = results.filter(r => r.status === 'FAILED').length;

  if (successCount === 1 && failureCount === 1 && walletBalance === 0) {
    console.log('\n✅ CONCURRENCY TEST PASSED: Exactly 1 transaction succeeded, 1 was blocked due to balance limit, and wallet balance remained non-negative.');
  } else {
    console.log('\n❌ CONCURRENCY TEST FAILED: Race condition detected!');
  }
}

runConcurrencyTest();
