import {
    ALLOWED_GROUP_SIZES,
    GroupOrderError,
    isAllowedGroupSize,
    premiumGroupDeliveryFee,
    instantGroupDeliveryFee,
    resolveFoodGroupPricing,
    resolveFoodDeliveryPricing,
} from '../src/services/groupPricing.ts';

function assert(condition: unknown, message: string) {
    if (!condition) throw new Error(message);
}

function throws(fn: () => unknown, match: string) {
    try {
        fn();
    } catch (error: any) {
        assert(error instanceof GroupOrderError, `Expected GroupOrderError, got ${error?.name}`);
        assert(String(error.message).includes(match), `Expected message to include "${match}", got "${error.message}"`);
        return;
    }
    throw new Error(`Expected throw matching "${match}"`);
}

function run() {
    assert(ALLOWED_GROUP_SIZES.join(',') === '2,4,6,8,10', 'Allowed group sizes must stay 2,4,6,8,10');
    assert(isAllowedGroupSize(4), '4 is an allowed group size');
    assert(!isAllowedGroupSize(3), '3 is not an allowed group size');
    assert(premiumGroupDeliveryFee(1250) === 1000, 'Premium group fee is 20% off, rounded');
    assert(instantGroupDeliveryFee(1000) === 800, 'Instant group fee is 20% off by default (1000 -> 800)');
    assert(instantGroupDeliveryFee(700) === 560, 'Instant group fee is 20% off by default (700 -> 560)');
    assert(instantGroupDeliveryFee(1000, { instantGroupDeliveryFee: 850 }) === 850, 'Configured instantGroupDeliveryFee overrides default');

    // Test resolveFoodDeliveryPricing
    const instantGroup = resolveFoodDeliveryPricing({
        isInstant: true,
        isGroup: true,
        isPremium: false,
        plateCount: 2,
        platformSettings: { instantDeliveryFee: 1000, foodGroupDeliveryFee: 600 },
    });
    assert(instantGroup.grossFeePerPlate === 1000, 'Instant group gross fee is 1000');
    assert(instantGroup.netFeePerPlate === 800, 'Instant group net fee is 800 (not scheduled 600!)');
    assert(instantGroup.discountPerPlate === 200, 'Instant group discount per plate is 200');
    assert(instantGroup.totalGrossDelivery === 2000, 'Instant group total gross is 2000');
    assert(instantGroup.totalNetDelivery === 1600, 'Instant group total net is 1600');
    assert(instantGroup.totalDiscount === 400, 'Instant group total discount is 400');

    const scheduledGroup = resolveFoodDeliveryPricing({
        isInstant: false,
        isGroup: true,
        isPremium: false,
        plateCount: 2,
        platformSettings: { foodDeliveryFee: 800, foodGroupDeliveryFee: 600 },
    });
    assert(scheduledGroup.grossFeePerPlate === 800, 'Scheduled group gross fee is 800');
    assert(scheduledGroup.netFeePerPlate === 600, 'Scheduled group net fee is 600');
    assert(scheduledGroup.discountPerPlate === 200, 'Scheduled group discount per plate is 200');
    assert(scheduledGroup.totalGrossDelivery === 1600, 'Scheduled group total gross is 1600');
    assert(scheduledGroup.totalNetDelivery === 1200, 'Scheduled group total net is 1200');
    assert(scheduledGroup.totalDiscount === 400, 'Scheduled group total discount is 400');

    const solo = resolveFoodGroupPricing({
        deliveryMode: 'solo',
        plates: [{}, {}],
        plateCount: 2,
        groupSize: 8,
    });
    assert(solo.isGroup === false, 'Solo stays solo even if a group size is present');
    assert(solo.groupSize === 1, 'Solo groupSize is 1');
    assert(solo.plateCount === 2, 'Solo plateCount uses plates');

    const group = resolveFoodGroupPricing({
        deliveryMode: 'group',
        plates: [{}, {}, {}, {}],
        groupSize: 4,
    });
    assert(group.isGroup === true, 'Valid group order is accepted');
    assert(group.groupSize === 4, 'Valid group size is preserved');
    assert(group.plateCount === 4, 'Group plateCount matches plates');

    throws(
        () => resolveFoodGroupPricing({ deliveryMode: 'group', plates: [{}], groupSize: 2 }),
        'at least 2 plates'
    );
    throws(
        () => resolveFoodGroupPricing({ deliveryMode: 'group', plates: [{}, {}], groupSize: 3 }),
        'must be 2, 4, 6, 8 or 10'
    );
    throws(
        () => resolveFoodGroupPricing({ deliveryMode: 'group', plates: [{}, {}], groupSize: 1 }),
        'must be 2, 4, 6, 8 or 10'
    );

    const comboSolo = resolveFoodGroupPricing({
        type: 'combo',
        deliveryMode: 'solo',
        quantity: 1,
    });
    assert(comboSolo.isGroup === false, 'Combo solo stays solo');
    assert(comboSolo.plateCount === 1, 'Combo solo uses quantity');

    const comboGroup = resolveFoodGroupPricing({
        type: 'combo',
        deliveryMode: 'group',
        quantity: 3,
    });
    assert(comboGroup.isGroup === true, 'Combo group with quantity >= 2 is accepted');
    assert(comboGroup.groupSize === 3, 'Combo groupSize defaults to quantity');

    throws(
        () => resolveFoodGroupPricing({ type: 'combo', deliveryMode: 'group', quantity: 1 }),
        'at least 2 combos'
    );

    console.log('group pricing tests passed');
}

run();
