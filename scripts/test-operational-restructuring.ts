import assert from 'node:assert/strict';
import {
  DEFAULT_FOOD_OPERATING_DAYS,
  formatFoodOperatingDays,
  getFoodDeliveryAvailability,
  getLagosDateParts,
  isDateStrFoodOperatingDay,
  isFoodOperatingDay,
  normalizeFoodOperatingDays,
  validateFoodOperatingDaysInput,
} from '../src/services/foodSchedule.ts';
import { validateServiceAndSchedule } from '../server/order-guards.ts';
import calebnetHandler from '../api/calebnet.ts';

function createMockDb(platformSettings: Record<string, any> | null) {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => ({
          exists: name === 'settings' && id === 'platform' && platformSettings !== null,
          data: () => platformSettings,
        }),
      }),
    }),
  } as any;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    headersSent: false,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
    end() {
      this.headersSent = true;
      return this;
    },
  };
  return res;
}

async function run() {
  console.log('1. Testing Africa/Lagos timezone weekday resolution across all 7 days...');
  // 2026-11-09 is Monday in Lagos (noon UTC = 13:00 WAT)
  const lagosWeekDates = [
    { dayName: 'Monday', expectedDay: 1, date: new Date('2026-11-09T12:00:00Z'), expectedOpenDefault: false },
    { dayName: 'Tuesday', expectedDay: 2, date: new Date('2026-11-10T12:00:00Z'), expectedOpenDefault: false },
    { dayName: 'Wednesday', expectedDay: 3, date: new Date('2026-11-11T12:00:00Z'), expectedOpenDefault: false },
    { dayName: 'Thursday', expectedDay: 4, date: new Date('2026-11-12T12:00:00Z'), expectedOpenDefault: false },
    { dayName: 'Friday', expectedDay: 5, date: new Date('2026-11-13T12:00:00Z'), expectedOpenDefault: true },
    { dayName: 'Saturday', expectedDay: 6, date: new Date('2026-11-14T12:00:00Z'), expectedOpenDefault: true },
    { dayName: 'Sunday', expectedDay: 0, date: new Date('2026-11-15T12:00:00Z'), expectedOpenDefault: true },
  ];

  for (const entry of lagosWeekDates) {
    const parts = getLagosDateParts(entry.date);
    assert.equal(parts.weekday, entry.expectedDay, `Expected ${entry.dayName} weekday`);
    assert.equal(parts.weekdayName, entry.dayName);
    assert.equal(
      isFoodOperatingDay(DEFAULT_FOOD_OPERATING_DAYS, entry.date),
      entry.expectedOpenDefault,
      `Default Fri-Sun check failed for ${entry.dayName}`
    );

    const avail = getFoodDeliveryAvailability({ foodOperatingDays: DEFAULT_FOOD_OPERATING_DAYS }, entry.date);
    assert.equal(avail.isAvailable, entry.expectedOpenDefault);
    if (!entry.expectedOpenDefault) {
      assert.equal(avail.reason, 'OUTSIDE_OPERATING_DAYS');
      assert.equal(avail.nextOperatingDay?.label, 'Friday');
    }
  }

  // Timezone boundary: Thursday 23:30 UTC is Friday 00:30 Africa/Lagos (WAT) -> MUST be Friday (open!)
  const thuUtcFriLagos = new Date('2026-11-12T23:30:00Z');
  assert.equal(getLagosDateParts(thuUtcFriLagos).weekdayName, 'Friday');
  assert.equal(isFoodOperatingDay(DEFAULT_FOOD_OPERATING_DAYS, thuUtcFriLagos), true);

  // Sunday 23:30 UTC is Monday 00:30 Africa/Lagos -> MUST be Monday (closed!)
  const sunUtcMonLagos = new Date('2026-11-15T23:30:00Z');
  assert.equal(getLagosDateParts(sunUtcMonLagos).weekdayName, 'Monday');
  assert.equal(isFoodOperatingDay(DEFAULT_FOOD_OPERATING_DAYS, sunUtcMonLagos), false);
  console.log('   PASSED: All 7 weekdays & Africa/Lagos midnight boundary');

  console.log('2. Testing admin schedule configurations & validation...');
  assert.deepEqual(normalizeFoodOperatingDays(undefined), [5, 6, 0]);
  assert.deepEqual(normalizeFoodOperatingDays([]), []);
  assert.equal(formatFoodOperatingDays([5, 6, 0]), 'Fridays, Saturdays & Sundays');
  assert.equal(formatFoodOperatingDays([1, 2, 3, 4, 5, 6, 0]), 'Every day (Monday – Sunday)');
  assert.equal(formatFoodOperatingDays([]), 'Temporarily suspended (No operating days)');

  assert.equal(validateFoodOperatingDaysInput([7]).valid, false);
  assert.equal(validateFoodOperatingDaysInput([-1]).valid, false);
  assert.equal(validateFoodOperatingDaysInput('Fri').valid, false);
  assert.equal(validateFoodOperatingDaysInput([3, 1, 2, 1]).valid, true);

  // Mon-Wed schedule
  const monWedDb = createMockDb({ foodOperatingDays: [1, 2, 3], isAcceptingOrders: true, isFoodOrderingClosed: false });
  const monCheck = await validateServiceAndSchedule(monWedDb, { vertical: 'FOOD', now: lagosWeekDates[0].date });
  assert.equal(monCheck.allowed, true);
  const friOnMonWedCheck = await validateServiceAndSchedule(monWedDb, { vertical: 'FOOD', now: lagosWeekDates[4].date });
  assert.equal(friOnMonWedCheck.allowed, false);
  assert.equal(friOnMonWedCheck.code, 'FOOD_OUTSIDE_OPERATING_DAYS');

  // All 7 days enabled
  const allDaysDb = createMockDb({ foodOperatingDays: [0, 1, 2, 3, 4, 5, 6], isAcceptingOrders: true, isFoodOrderingClosed: false });
  for (const entry of lagosWeekDates) {
    const res = await validateServiceAndSchedule(allDaysDb, { vertical: 'FOOD', now: entry.date });
    assert.equal(res.allowed, true, `All-7-days should allow ${entry.dayName}`);
  }

  // All 7 days disabled
  const suspendedDb = createMockDb({ foodOperatingDays: [], isAcceptingOrders: true, isFoodOrderingClosed: false });
  for (const entry of lagosWeekDates) {
    const res = await validateServiceAndSchedule(suspendedDb, { vertical: 'FOOD', now: entry.date });
    assert.equal(res.allowed, false, `Suspended schedule should reject ${entry.dayName}`);
    assert.equal(res.code, 'FOOD_OUTSIDE_OPERATING_DAYS');
  }
  console.log('   PASSED: Admin schedule variants & validation');

  console.log('3. Testing scheduled batch date validation...');
  assert.equal(isDateStrFoodOperatingDay('2026-11-14', [5, 6, 0]), true); // Saturday
  assert.equal(isDateStrFoodOperatingDay('2026-11-18', [5, 6, 0]), false); // Wednesday
  const friDb = createMockDb({ foodOperatingDays: [5, 6, 0], isAcceptingOrders: true, isFoodOrderingClosed: false });
  const badBatchDate = await validateServiceAndSchedule(friDb, {
    vertical: 'FOOD',
    scheduledDateStr: '2026-11-18',
    now: lagosWeekDates[4].date, // Even if today is Friday, scheduling for Wednesday is rejected
  });
  assert.equal(badBatchDate.allowed, false);
  assert.equal(badBatchDate.code, 'FOOD_OUTSIDE_OPERATING_DAYS');
  console.log('   PASSED: Scheduled batch date validation');

  console.log('4. Testing discontinued Mart & CalebNet + Fashion unaffected...');
  const martGuard = await validateServiceAndSchedule(friDb, { vertical: 'MART', now: lagosWeekDates[4].date });
  assert.equal(martGuard.allowed, false);
  assert.equal(martGuard.httpStatus, 410);
  assert.equal(martGuard.code, 'MART_DISCONTINUED');

  const fashionGuard = await validateServiceAndSchedule(suspendedDb, { vertical: 'FASHION', now: lagosWeekDates[0].date });
  assert.equal(fashionGuard.allowed, true);

  const calebnetPurchaseRes = createMockRes();
  await calebnetHandler({ query: { path: 'purchase' }, url: '/api/calebnet/purchase', method: 'POST' } as any, calebnetPurchaseRes);
  assert.equal(calebnetPurchaseRes.statusCode, 410);
  assert.equal(calebnetPurchaseRes.body?.error, 'CALEBNET_DISCONTINUED');

  const calebnetVerifyRes = createMockRes();
  await calebnetHandler({ query: { path: 'verify-payment' }, url: '/api/calebnet/verify-payment', method: 'POST' } as any, calebnetVerifyRes);
  assert.equal(calebnetVerifyRes.statusCode, 410);
  assert.equal(calebnetVerifyRes.body?.error, 'CALEBNET_DISCONTINUED');
  console.log('   PASSED: Mart & CalebNet discontinued; Fashion unaffected');

  console.log('\nALL OPERATIONAL RESTRUCTURING TESTS PASSED!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
