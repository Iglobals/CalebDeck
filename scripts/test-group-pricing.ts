import {
    ALLOWED_GROUP_SIZES,
    GroupOrderError,
    isAllowedGroupSize,
    premiumGroupDeliveryFee,
    resolveFoodGroupPricing,
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
