import {
    classifyClubkonnectOutcome,
    isClubkonnectAuthFailure,
    mapProviderStatus,
    sanitizeClubkonnectBody,
} from '../server/calebnet-status.ts';

function assert(condition: unknown, message: string) {
    if (!condition) throw new Error(message);
}

function run() {
    assert(mapProviderStatus({ status: 'INVALID_CREDENTIALS' }) === 'REFUND_REQUIRED', 'INVALID_CREDENTIALS must refund');
    assert(mapProviderStatus({ status: 'INSUFFICIENT_BALANCE' }) === 'REFUND_REQUIRED', 'INSUFFICIENT_BALANCE must refund');
    assert(mapProviderStatus({ status: 'ORDER_RECEIVED', statuscode: '100' }) === 'ORDER_RECEIVED', 'ORDER_RECEIVED stays pending');
    assert(mapProviderStatus({ status: 'ORDER_COMPLETED', statuscode: '200' }) === 'SUCCESSFUL', 'ORDER_COMPLETED is successful');
    assert(mapProviderStatus({ status: 'ORDER_ONHOLD' }) === 'PENDING_PROVIDER', 'ONHOLD is not refunded');

    assert(classifyClubkonnectOutcome({ status: 'INVALID_CREDENTIALS' }) === 'auth', 'classify auth');
    assert(classifyClubkonnectOutcome({ status: 'MISSING_APIKEY' }) === 'auth_missing', 'classify missing key');
    assert(classifyClubkonnectOutcome({ status: 'INSUFFICIENT_BALANCE' }) === 'insufficient_balance', 'classify insufficient');
    assert(classifyClubkonnectOutcome({ status: 'INVALID_DATAPLAN' }) === 'validation', 'classify plan validation');
    assert(classifyClubkonnectOutcome({}, { timeout: true }) === 'timeout', 'classify timeout');
    assert(isClubkonnectAuthFailure({ status: 'INVALID_CREDENTIALS' }) === true, 'auth failure detector');
    assert(isClubkonnectAuthFailure({ status: 'ORDER_COMPLETED' }) === false, 'success is not auth failure');

    const sanitized = sanitizeClubkonnectBody({
        status: 'INVALID_CREDENTIALS',
        APIKey: 'secret-should-not-appear',
        UserID: 'CKSHOULDNOTAPPEAR',
        mobilenumber: '08012345678',
    }) as Record<string, unknown>;
    assert(!('APIKey' in sanitized), 'APIKey stripped');
    assert(!('UserID' in sanitized), 'UserID stripped');
    assert(sanitized.mobilenumber === '[redacted]', 'phone redacted');
    assert(sanitized.status === 'INVALID_CREDENTIALS', 'status preserved');

    console.log('clubkonnect status classification tests passed');
}

run();
