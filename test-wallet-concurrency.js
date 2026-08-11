const fetch = require('node-fetch');

// INSTRUCTIONS:
// 1. Run the local dev server: npm run dev
// 2. Get a valid Firebase Auth ID Token for a test user.
// 3. Ensure the test user's wallet balance is exactly enough for ONE order, but not two.
//    (e.g. if the order total is ₦2000, set the wallet balance to ₦2500)
// 4. Run this script: node test-wallet-concurrency.js

const API_URL = 'http://localhost:5173/api/wallet/pay-order'; // Adjust port if needed
const ID_TOKEN = 'PASTE_YOUR_ID_TOKEN_HERE';

// Dummy order data that matches what MartCheckout sends
const mockOrderPayload = {
  orderId: `TEST-${Math.floor(10000 + Math.random() * 90000)}`,
  fullName: 'Test User',
  studentName: 'Test User',
  phone: '08012345678',
  hostel: 'sussana',
  hostelName: 'Sussana Hall',
  instructions: 'Test concurrency',
  femaleHostelAgreement: true,
  orderType: 'MART',
  items: [
    {
      id: 'test-item-1',
      name: 'Test Indomie',
      price: 1500,
      quantity: 1,
      category: 'Food'
    }
  ],
  deliveryFee: 1500,
  serviceProcessingFee: 300,
  subtotal: 1500,
  totalAmount: 3300 // 1500 + 1500 + 300
};

async function fireRequest(attemptNumber) {
  console.log(`[Attempt ${attemptNumber}] Firing request...`);
  try {
    const start = Date.now();
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ID_TOKEN}`
      },
      body: JSON.stringify({ orderData: mockOrderPayload })
    });
    const data = await res.json();
    const duration = Date.now() - start;
    
    if (res.ok) {
      console.log(`✅ [Attempt ${attemptNumber}] SUCCEEDED in ${duration}ms! Order ID: ${data.data.orderId}`);
    } else {
      console.log(`❌ [Attempt ${attemptNumber}] FAILED in ${duration}ms! Reason: ${data.error}`);
    }
  } catch (err) {
    console.log(`❌ [Attempt ${attemptNumber}] CRASHED! Reason: ${err.message}`);
  }
}

async function runConcurrencyTest() {
  if (ID_TOKEN === 'PASTE_YOUR_ID_TOKEN_HERE') {
    console.error('⚠️ Please provide a valid ID_TOKEN in the script before running.');
    return;
  }

  console.log(`🚀 Starting concurrency test for Order Total: ₦${mockOrderPayload.totalAmount}`);
  console.log('Ensure your wallet balance is < ₦6600 (enough for 1, not 2).');
  console.log('Firing 2 simultaneous requests...\n');

  // Fire requests simultaneously
  await Promise.all([
    fireRequest(1),
    fireRequest(2)
  ]);

  console.log('\n🏁 Test complete. Exactly one should succeed, and one should fail with insufficient funds.');
}

runConcurrencyTest();
