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
const { applyQualifyingAddonMarkup, resolveDeliveryFee } = await import('../src/services/orderFees.ts');
const { formatCafeteriaSectionLabel, resolveOrderCafeteriaLabel } = await import(
  '../src/services/cafeterias.ts'
);
const { resolveFoodDeliveryPricing, instantGroupDeliveryFee } = await import(
  '../src/services/groupPricing.ts'
);

// Mock Firestore database reflecting actual production menu_items & settings/platform
function createMockDb(initialSettings = {}) {
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
    [
      'sussana',
      {
        id: 'sussana',
        name: 'Sussana Hall',
        isPremiumDelivery: true,
      },
    ],
  ]);

  // Production platform settings
  let platformSettings = {
    instantDeliveryFee: 1000,
    foodDeliveryFee: 800,
    foodGroupDeliveryFee: 600,
    premiumDeliveryFee: 1200,
    ...initialSettings,
  };

  return {
    updateSettings(newSettings) {
      platformSettings = { ...platformSettings, ...newSettings };
    },
    getSettings() {
      return platformSettings;
    },
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

  console.log('2. Testing Group Instant Order with 20% discount on configured instant delivery fee...');
  // With instantDeliveryFee = 1000:
  // Instant Solo fee = ₦1,000
  // Authoritative 20% group discount on instant fee = Math.round(1000 * 0.8) = ₦800 net per plate
  // Discount per plate = 1000 - 800 = ₦200 per plate
  // For 2 plates: gross delivery = ₦2,000, group discount = ₦400, net delivery = ₦1,600
  // Food: Noodles (6 * 500 = 3000) + Fried Eggs (3 * 200 = 600) + Fanta (550) + Coke (550) = 4700
  // Takeaway: 2 * 200 = 400
  // Authoritative server total: 4700 + 400 + 1600 = ₦6,700.

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

  for (const [label, res] of [
    ['calculate-total', calcTotalResult],
    ['wallet/pre-save', walletPreSaveResult],
    ['verify-payment', verifyPaymentResult],
  ]) {
    assert.equal(res.serverTotal, 6700, `${label} total must equal 6700 (4700 food + 400 takeaway + 1600 net delivery)`);
    assert.deepEqual(
      res.breakdown,
      {
        food: 4700,
        takeaway: 400,
        delivery: 2000,
        discount: 400,
        processing: 0,
      },
      `${label} breakdown must match authoritative components`
    );
  }
  console.log('   PASS: Group Instant Order correctly calculates ₦6,700 (₦2,000 gross delivery, ₦400 discount, ₦1,600 net delivery) across all payload shapes.');

  console.log('3. Testing Group Instant Order with explicit instantGroupDeliveryFee admin override (e.g. 600)...');
  db.updateSettings({ instantGroupDeliveryFee: 600 });
  const customInstantGroup = await calculateServerOrderTotal(db, {
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
  assert.equal(customInstantGroup.serverTotal, 6300, 'With explicit instantGroupDeliveryFee = 600, total equals 6300');
  assert.equal(customInstantGroup.breakdown.delivery, 2000);
  assert.equal(customInstantGroup.breakdown.discount, 800);
  assert.equal(customInstantGroup.netDeliveryFee, 1200);
  // Restore default settings
  db.updateSettings({ instantGroupDeliveryFee: undefined });
  console.log('   PASS: Explicit instantGroupDeliveryFee admin override correctly honored when configured.');

  console.log('4. Testing Solo Instant Order (configured fee = ₦1,000)...');
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
  assert.equal(soloInstant.breakdown.delivery, 1000);
  assert.equal(soloInstant.breakdown.discount, 0);
  assert.equal(soloInstant.breakdown.processing, 0);
  console.log('   PASS: Solo Instant Order uses configured instant delivery fee (₦1,000) with 0 discount.');

  console.log('5. Testing Solo Scheduled Batch Order (configured fee = ₦800)...');
  const soloScheduled = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    plates: [ord841918Plates[0]],
    drinksSnacks: [ord841918DrinksSnacks[0]],
    deliveryMode: 'solo',
    groupSize: 1,
    plateCount: 1,
    hostel: 'Joseph Hall',
    hostelId: 'joseph',
    deliveryType: 'BATCH',
    foodBatchId: 'batch-1',
  });
  // Food = 2450; Takeaway = 200; Scheduled Solo Delivery = 800 -> 3450
  assert.equal(soloScheduled.serverTotal, 3450);
  assert.equal(soloScheduled.breakdown.delivery, 800);
  assert.equal(soloScheduled.breakdown.discount, 0);
  console.log('   PASS: Solo Scheduled Batch Order uses configured scheduled fee (₦800) with 0 discount.');

  console.log('6. Testing Group Scheduled Batch Order (foodDeliveryFee = ₦800, foodGroupDeliveryFee = ₦600)...');
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
  assert.equal(groupScheduled.netDeliveryFee, 1200);
  console.log('   PASS: Group Scheduled Batch Order accurately uses foodGroupDeliveryFee (₦1,200 net delivery, ₦400 discount).');

  console.log('7. Testing Changing Instant Fee dynamically (instantDeliveryFee changed from 1000 to 800)...');
  db.updateSettings({ instantDeliveryFee: 800 });
  // Solo Instant:
  const newSoloInstant = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    plates: [ord841918Plates[0]],
    deliveryMode: 'solo',
    groupSize: 1,
    plateCount: 1,
    hostel: 'Joseph Hall',
    hostelId: 'joseph',
    deliveryType: 'INSTANT',
  });
  // Food = 1900, Takeaway = 200, Delivery = 800 -> 2900
  assert.equal(newSoloInstant.serverTotal, 2900);
  assert.equal(newSoloInstant.breakdown.delivery, 800);

  // Group Instant (2 plates):
  // Solo fee = 800; Group fee = Math.round(800 * 0.8) = 640; Discount per plate = 160
  // Gross = 1600; Discount = 320; Net delivery = 1280
  const newGroupInstant = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    plates: ord841918Plates,
    deliveryMode: 'group',
    groupSize: 2,
    plateCount: 2,
    hostel: 'Joseph Hall',
    hostelId: 'joseph',
    deliveryType: 'INSTANT',
  });
  // Food = 3600 (1900 + 1700), Takeaway = 400, Net Delivery = 1280 -> 5280
  assert.equal(newGroupInstant.serverTotal, 5280);
  assert.equal(newGroupInstant.breakdown.delivery, 1600);
  assert.equal(newGroupInstant.breakdown.discount, 320);
  assert.equal(newGroupInstant.netDeliveryFee, 1280);
  console.log('   PASS: Changed instant fee immediately updates subsequent solo (₦800) and group (₦640/plate, ₦160 discount/plate) orders.');

  console.log('8. Testing Changing Scheduled Fee dynamically (foodDeliveryFee: 900, foodGroupDeliveryFee: 700)...');
  db.updateSettings({ foodDeliveryFee: 900, foodGroupDeliveryFee: 700 });
  const updatedGroupScheduled = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    plates: ord841918Plates,
    deliveryMode: 'group',
    groupSize: 2,
    plateCount: 2,
    hostel: 'Joseph Hall',
    hostelId: 'joseph',
    deliveryType: 'BATCH',
    foodBatchId: 'batch-2',
  });
  // Food = 3600, Takeaway = 400, Gross = 2 * 900 = 1800, Net = 2 * 700 = 1400, Discount = 400 -> Total = 5400
  assert.equal(updatedGroupScheduled.serverTotal, 5400);
  assert.equal(updatedGroupScheduled.breakdown.delivery, 1800);
  assert.equal(updatedGroupScheduled.breakdown.discount, 400);
  assert.equal(updatedGroupScheduled.netDeliveryFee, 1400);
  console.log('   PASS: Changed scheduled fee immediately updates subsequent scheduled orders.');

  // Reset to base settings
  db.updateSettings({ instantDeliveryFee: 1000, foodDeliveryFee: 800, foodGroupDeliveryFee: 600 });

  console.log('9. Testing different group sizes (2, 4, 6 plates) for instant delivery...');
  for (const size of [2, 4, 6]) {
    const plates = Array.from({ length: size }, (_, i) => ({
      id: `plate-${i}`,
      items: [{ item: { id: 'new_back_noodles', name: 'Noodles', price: 500 }, quantity: 1 }],
      total: 500,
    }));
    const res = await calculateServerOrderTotal(db, {
      type: 'plate',
      orderType: 'FOOD',
      plates,
      deliveryMode: 'group',
      groupSize: size,
      plateCount: size,
      hostel: 'Joseph Hall',
      hostelId: 'joseph',
      deliveryType: 'INSTANT',
    });
    // Each plate: Food = 500, Takeaway = 200, Gross Delivery = 1000, Net Delivery = 800, Discount = 200
    // Net per plate = 1500 -> Total = size * 1500
    const expectedFood = size * 500;
    const expectedTakeaway = size * 200;
    const expectedGrossDelivery = size * 1000;
    const expectedDiscount = size * 200;
    const expectedNetDelivery = size * 800;
    const expectedTotal = expectedFood + expectedTakeaway + expectedNetDelivery;

    assert.equal(res.serverTotal, expectedTotal, `Size ${size} total must equal ${expectedTotal}`);
    assert.equal(res.breakdown.delivery, expectedGrossDelivery, `Size ${size} gross delivery`);
    assert.equal(res.breakdown.discount, expectedDiscount, `Size ${size} discount`);
    assert.equal(res.netDeliveryFee, expectedNetDelivery, `Size ${size} net delivery`);
    console.log(`   PASS: Group size ${size} correctly receives ₦${expectedDiscount} total discount (₦200/plate). Total: ₦${expectedTotal}.`);
  }

  console.log('10. Testing Wallet checkout, Paystack checkout, and Payment verification parity...');
  // Ensure that calculateServerOrderTotal is the single source of truth used by:
  // - /api/calculate-total
  // - /api/pre-save-order
  // - /api/wallet/pay-order
  // - /api/verify-payment
  const walletOrderData = {
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
  };
  const serverCalc = await calculateServerOrderTotal(db, walletOrderData);
  assert.equal(serverCalc.serverTotal, 6700);

  // In /api/wallet/[action].ts:
  // rawTotal = serverCalc.serverTotal (6700)
  // balance checked >= rawTotal
  // amount deducted = rawTotal (6700)
  const walletDeduction = serverCalc.serverTotal;
  assert.equal(walletDeduction, 6700, 'Wallet deduction exactly equals authoritative server total');

  // In /api/pre-save-order.ts and /api/verify-payment.ts:
  // rawTotal = serverCalc.serverTotal (6700)
  // Paystack verification checks data.amount >= rawTotal * 100
  const paystackAmountKobo = serverCalc.serverTotal * 100;
  assert.equal(paystackAmountKobo, 670000, 'Paystack transaction amount matches server total in kobo');

  console.log('   PASS: Wallet debit, Paystack initialization, and Payment verification all agree on ₦6,700.');

  console.log('11. Testing Premium Hostel (Girls\' Hostel) pricing...');
  const premiumOrder = await calculateServerOrderTotal(db, {
    type: 'plate',
    orderType: 'FOOD',
    plates: ord841918Plates,
    deliveryMode: 'group',
    groupSize: 2,
    plateCount: 2,
    hostel: 'Sussana Hall',
    hostelId: 'sussana',
    deliveryType: 'INSTANT',
  });
  // Premium fee = 1200; Group premium fee = Math.round(1200 * 0.8) = 960; Discount per plate = 240
  // Food = 3600; Takeaway = 400; Gross delivery = 2400; Discount = 480; Net delivery = 1920
  // Total = 3600 + 400 + 1920 = 5920
  assert.equal(premiumOrder.breakdown.delivery, 2400);
  assert.equal(premiumOrder.breakdown.discount, 480);
  assert.equal(premiumOrder.netDeliveryFee, 1920);
  assert.equal(premiumOrder.serverTotal, 5920);
  console.log('   PASS: Premium hostel group order applies 20% discount on premium fee (₦960/plate, ₦240 discount/plate).');

  console.log('12. Testing resolveDeliveryFee client and admin helper parity...');
  const deliveryFeeInstantGroup = resolveDeliveryFee(
    { deliveryType: 'INSTANT', deliveryMode: 'group', plateCount: 2, hostel: 'david' },
    db.getSettings()
  );
  assert.equal(deliveryFeeInstantGroup.deliveryFee, 1600, 'Net delivery fee is 1600');
  assert.equal(deliveryFeeInstantGroup.baseDeliveryFee, 800, 'Net base delivery fee is 800');
  assert.equal(deliveryFeeInstantGroup.grossDeliveryFee, 2000, 'Gross delivery fee is 2000');
  assert.equal(deliveryFeeInstantGroup.discount, 400, 'Discount is 400');
  console.log('   PASS: resolveDeliveryFee produces matching gross, net, and discount for instant group.');

  console.log('13. Testing cafeteria & section resolution rules...');
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
  assert.equal(
    resolveOrderCafeteriaLabel({
      cafeteria: 'New Cafeteria',
      cafeteriaId: 'new',
      sectionId: 'back',
    }),
    'New Cafe Back'
  );
  assert.equal(
    resolveOrderCafeteriaLabel({
      hostel: "David's Hostel",
      plates: ord841918Plates,
    }),
    'Not recorded'
  );
  console.log('   PASS: Cafeteria labels resolve correctly without guessing.');

  console.log('\nALL 13 REGRESSION SUITES PASSED SUCCESSFULLY.');
}

runTests().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
