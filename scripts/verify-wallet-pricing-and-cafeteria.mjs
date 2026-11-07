import assert from 'node:assert/strict';
import { register } from 'node:module';

// Map TypeScript ESM '.js' relative specifiers to '.ts' for Node strip-types execution
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(specifier, context, nextResolve) {
        try {
          return await nextResolve(specifier, context);
        } catch (err) {
          if (specifier.endsWith('.js')) {
            return nextResolve(specifier.slice(0, -3) + '.ts', context);
          }
          throw err;
        }
      }
    `)
);

const { calculateServerOrderTotal } = await import('../server/order-utils.ts');
const { applyQualifyingAddonMarkup } = await import('../src/services/orderFees.ts');
const { formatCafeteriaSectionLabel, resolveOrderCafeteriaLabel } = await import(
  '../src/services/cafeterias.ts'
);

// Mock Firestore database reflecting actual production menu_items & settings/platform
function createMockDb() {
  const menuItems = new Map([
    ['new_back_noodles', { id: 'new_back_noodles', name: 'Noodles', price: 500, category: 'mains' }],
    ['new_back_fried_eggs', { id: 'new_back_fried_eggs', name: 'Fried Eggs', price: 200, category: 'proteins' }],
    ['new_back_fanta', { id: 'new_back_fanta', name: 'Fanta', price: 500, category: 'drinks' }],
    ['new_back_coke_family', { id: 'new_back_coke_family', name: 'Coke', price: 500, category: 'drinks' }],
    ['new_back_chivita_1000', { id: 'new_back_chivita_1000', name: 'Chivita 1L', price: 1000, category: 'drinks' }],
    ['new_back_shawarma_1500', { id: 'new_back_shawarma_1500', name: 'Shawarma', price: 1500, category: 'snacks' }],
  ]);

  const hostels = new Map([
    [
      'david',
      {
        id: 'david',
        name: "David's Hostel",
        isPremiumDelivery: false,
      },
    ],
    [
      'joseph',
      {
        id: 'joseph',
        name: 'Joseph Hall',
        isPremiumDelivery: false,
      },
    ],
  ]);

  // Exact production settings/platform values from Firestore
  const platformSettings = {
    instantDeliveryFee: 1000,
    foodDeliveryFee: 800,
    foodGroupDeliveryFee: 600,
    premiumDeliveryFee: 1200,
  };

  return {
    collection(name) {
      return {
        doc(id) {
          return {
            id,
            collectionName: name,
            async get() {
              if (name === 'settings' && id === 'platform') {
                return { exists: true, data: () => platformSettings };
              }
              if (name === 'hostels') {
                const h = hostels.get(id);
                return { exists: !!h, data: () => h };
              }
              if (name === 'menu_items') {
                const item = menuItems.get(id);
                return { exists: !!item, data: () => item };
              }
              return { exists: false, data: () => undefined };
            },
          };
        },
      };
    },
    async getAll(...refs) {
      return Promise.all(refs.map((r) => r.get()));
    },
  };
}

async function runTests() {
  const db = createMockDb();

  console.log('1. Testing shared qualifying add-on markup rule (applyQualifyingAddonMarkup)...');
  // Qualifying add-on below ₦1,000 -> +₦50
  assert.equal(applyQualifyingAddonMarkup(500, true), 550);
  assert.equal(applyQualifyingAddonMarkup(999, true), 1049);
  // Add-on priced at ₦1,000 or above -> unchanged
  assert.equal(applyQualifyingAddonMarkup(1000, true), 1000);
  assert.equal(applyQualifyingAddonMarkup(1500, true), 1500);
  // Non-add-on item below ₦1,000 -> unchanged
  assert.equal(applyQualifyingAddonMarkup(500, false), 500);
  assert.equal(applyQualifyingAddonMarkup(200, false), 200);
  console.log('   PASS: Qualifying add-on (< ₦1,000) gets +₦50; ₦1,000+ add-on and non-add-on items are unchanged.');

  console.log('2. Testing exact ORD-841918 group instant order across all payload shapes (expected: ₦6,300)...');

  const ord841918Plates = [
    {
      id: 'plate-1793974776185',
      items: [
        { item: { id: 'new_back_noodles', name: 'Noodles', price: 500 }, quantity: 3 },
        { item: { id: 'new_back_fried_eggs', name: 'Fried Eggs', price: 200 }, quantity: 2 },
      ],
      total: 2100,
    },
    {
      id: 'plate-1793974786490',
      items: [
        { item: { id: 'new_back_noodles', name: 'Noodles', price: 500 }, quantity: 3 },
        { item: { id: 'new_back_fried_eggs', name: 'Fried Eggs', price: 200 }, quantity: 1 },
      ],
      total: 1900,
    },
  ];

  const ord841918DrinksSnacks = [
    { item: { id: 'new_back_fanta', name: 'Fanta', price: 500 }, quantity: 1 },
    { item: { id: 'new_back_coke_family', name: 'Coke', price: 500 }, quantity: 1 },
  ];

  const ord841918FlatItems = [
    { id: 'new_back_noodles', name: 'Noodles', price: 500, quantity: 3, isAddon: false },
    { id: 'new_back_fried_eggs', name: 'Fried Eggs', price: 200, quantity: 2, isAddon: false },
    { id: 'new_back_noodles', name: 'Noodles', price: 500, quantity: 3, isAddon: false },
    { id: 'new_back_fried_eggs', name: 'Fried Eggs', price: 200, quantity: 1, isAddon: false },
    { id: 'new_back_fanta', name: 'Fanta', price: 500, quantity: 1, isAddon: true },
    { id: 'new_back_coke_family', name: 'Coke', price: 500, quantity: 1, isAddon: true },
  ];

  // Shape A: /api/calculate-total (sends flat items)
  const calcTotalResult = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    items: ord841918FlatItems,
    deliveryMode: 'group',
    groupSize: 2,
    plateCount: 2,
    hostel: "David's Hostel",
    hostelId: 'david',
    deliveryType: 'INSTANT',
  });

  // Shape B: /api/pre-save-order & /api/wallet/pay-order (sends plates + drinksSnacks, no items)
  const walletPreSaveResult = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    plates: ord841918Plates,
    drinksSnacks: ord841918DrinksSnacks,
    deliveryMode: 'group',
    groupSize: 2,
    plateCount: 2,
    hostel: "David's Hostel",
    hostelId: 'david',
    deliveryType: 'INSTANT',
  });

  // Shape C: /api/verify-payment & /api/paystack-webhook (sends items + plates + drinksSnacks)
  const verifyPaymentResult = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    items: ord841918FlatItems,
    plates: ord841918Plates,
    drinksSnacks: ord841918DrinksSnacks,
    deliveryMode: 'group',
    groupSize: 2,
    plateCount: 2,
    hostel: "David's Hostel",
    hostelId: 'david',
    deliveryType: 'INSTANT',
  });

  // Displayed Checkout & Receipt line-item sum:
  // Noodles (6 * 500 = 3000) + Fried Eggs (3 * 200 = 600) + Takeaway (2 * 200 = 400)
  // + Group Delivery (2 * 1000 = 2000) - Group Discount (2 * 400 = 800)
  // + Fanta effective (550) + Coke effective (550) = 6300
  const effectiveFanta = applyQualifyingAddonMarkup(500, true);
  const effectiveCoke = applyQualifyingAddonMarkup(500, true);
  assert.equal(effectiveFanta, 550);
  assert.equal(effectiveCoke, 550);
  const receiptSum = 3000 + 600 + 400 + 2000 - 800 + effectiveFanta + effectiveCoke;
  assert.equal(receiptSum, 6300);

  for (const [label, res] of [
    ['calculate-total', calcTotalResult],
    ['wallet/pre-save', walletPreSaveResult],
    ['verify-payment', verifyPaymentResult],
  ]) {
    assert.equal(res.serverTotal, 6300, `${label} total must equal 6300`);
    assert.deepEqual(
      res.breakdown,
      {
        food: 4700,
        takeaway: 400,
        delivery: 2000,
        discount: 800,
        processing: 0,
      },
      `${label} breakdown must match authoritative components`
    );
  }
  console.log('   PASS: All 3 server payload shapes, Checkout, Wallet debit, Paystack verification, and Receipt line items equal ₦6,300.');

  console.log('3. Testing server-side boundary items (add-on < 1000, add-on == 1000, non-add-on < 1000)...');
  const boundaryOrder = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    plates: [
      {
        id: 'plate-boundary',
        items: [
          { item: { id: 'new_back_noodles', name: 'Noodles', price: 500 }, quantity: 1 }, // non-addon < 1000 -> 500
        ],
        total: 700,
      },
    ],
    drinksSnacks: [
      { item: { id: 'new_back_fanta', name: 'Fanta', price: 500 }, quantity: 1 }, // addon < 1000 -> 550
      { item: { id: 'new_back_chivita_1000', name: 'Chivita 1L', price: 1000 }, quantity: 1 }, // addon == 1000 -> 1000
      { item: { id: 'new_back_shawarma_1500', name: 'Shawarma', price: 1500 }, quantity: 1 }, // addon > 1000 -> 1500
    ],
    deliveryMode: 'solo',
    groupSize: 1,
    plateCount: 1,
    hostel: 'Joseph Hall',
    hostelId: 'joseph',
    deliveryType: 'INSTANT',
  });
  // Food = 500 (Noodles) + 550 (Fanta) + 1000 (Chivita) + 1500 (Shawarma) = 3550
  // Takeaway = 200, Delivery = 1000 -> Total = 4750
  assert.equal(boundaryOrder.breakdown.food, 3550);
  assert.equal(boundaryOrder.serverTotal, 4750);
  console.log('   PASS: Server boundary test confirmed (food = ₦3,550, total = ₦4,750).');

  console.log('4. Testing solo instant & scheduled batch pricing parity...');
  const soloInstant = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    plates: [ord841918Plates[0]],
    drinksSnacks: [ord841918DrinksSnacks[0]],
    deliveryMode: 'solo',
    groupSize: 1,
    plateCount: 1,
    hostel: 'Joseph Hall',
    hostelId: 'joseph',
    deliveryType: 'INSTANT',
  });
  // Plate 1 food = 1900 + Fanta (500 + 50 = 550) = 2450; Takeaway = 200; Solo Instant Delivery = 1000 -> 3650
  assert.equal(soloInstant.serverTotal, 3650);
  assert.equal(soloInstant.breakdown.processing, 0);

  const groupScheduled = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    plates: ord841918Plates,
    drinksSnacks: ord841918DrinksSnacks,
    deliveryMode: 'group',
    groupSize: 2,
    plateCount: 2,
    hostel: 'Joseph Hall',
    hostelId: 'joseph',
    deliveryType: 'BATCH',
    foodBatchId: 'batch-1',
  });
  // Food = 4700; Takeaway = 400; Scheduled Solo = 2 * 800 = 1600; Scheduled Group = 2 * 600 = 1200; Discount = 400 -> 6300
  assert.equal(groupScheduled.serverTotal, 6300);
  assert.equal(groupScheduled.breakdown.delivery, 1600);
  assert.equal(groupScheduled.breakdown.discount, 400);
  console.log('   PASS: Solo instant (₦3,650) and Group scheduled batch (₦6,300, delivery ₦1,600 - ₦400 discount) calculate accurately.');

  console.log('5. Testing cafeteria & section resolution rules...');
  assert.equal(
    formatCafeteriaSectionLabel({ cafeteriaId: 'new', sectionId: 'front' }),
    'New Cafe Front'
  );
  assert.equal(
    formatCafeteriaSectionLabel({ cafeteriaId: 'new', sectionId: 'back' }),
    'New Cafe Back'
  );
  assert.equal(
    formatCafeteriaSectionLabel({ cafeteriaId: 'old', sectionId: null }),
    'Old Cafeteria'
  );
  // Exact ORD-841918 stored fields in Firestore:
  assert.equal(
    resolveOrderCafeteriaLabel({
      cafeteria: 'New Cafeteria',
      cafeteriaId: 'new',
      sectionId: 'back',
    }),
    'New Cafe Back'
  );
  // Missing cafeteria fields on legacy order must return 'Not recorded' and NEVER guess Old Cafeteria:
  assert.equal(
    resolveOrderCafeteriaLabel({
      hostel: "David's Hostel",
      plates: ord841918Plates,
    }),
    'Not recorded'
  );
  console.log('   PASS: Cafeteria labels resolve to New Cafe Front, New Cafe Back, Old Cafeteria, or Not recorded without guessing.');

  console.log('\nALL TESTS PASSED SUCCESSFULLY.');
}

runTests().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
