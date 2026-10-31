export type FulfillmentStatus =
    'NOT_STARTED' | 'PROCESSING' | 'ORDER_RECEIVED' | 'PENDING_PROVIDER' |
    'SUCCESSFUL' | 'FAILED' | 'REFUND_REQUIRED' | 'CANCELLED' | 'REFUNDED';

export type ClubkonnectOutcomeClass =
    | 'auth'
    | 'auth_missing'
    | 'validation'
    | 'insufficient_balance'
    | 'success'
    | 'pending'
    | 'provider_error'
    | 'timeout'
    | 'ambiguous';

export function providerStatusText(input: any) {
    return String(input?.status || input?.orderstatus || input?.orderStatus || input?.Status || input?.message || input?.remark || '').trim();
}

export function classifyClubkonnectOutcome(input: any, options?: { timeout?: boolean }): ClubkonnectOutcomeClass {
    if (options?.timeout) return 'timeout';
    const rawStatus = providerStatusText(input).toUpperCase();
    if (!rawStatus && !input) return 'ambiguous';
    if (rawStatus.includes('INVALID_CREDENTIALS') || rawStatus === 'INVALID CREDENTIALS') return 'auth';
    if (rawStatus.includes('MISSING_CREDENTIALS') || rawStatus.includes('MISSING_USERID') || rawStatus.includes('MISSING_APIKEY')) return 'auth_missing';
    if (rawStatus.includes('INSUFFICIENT')) return 'insufficient_balance';
    if (
        rawStatus.includes('INVALID_DATAPLAN') ||
        rawStatus.includes('MISSING_DATAPLAN') ||
        rawStatus.includes('INVALID_RECIPIENT') ||
        rawStatus.includes('INVALID_AMOUNT') ||
        rawStatus.includes('INVALID_MOBILENETWORK') ||
        rawStatus.includes('MISSING_')
    ) {
        return 'validation';
    }
    if (rawStatus.includes('ORDER_COMPLETED') || rawStatus === 'SUCCESSFUL' || rawStatus === 'SUCCESS') return 'success';
    if (rawStatus.includes('ORDER_RECEIVED') || rawStatus.includes('PENDING') || rawStatus.includes('ONHOLD') || rawStatus.includes('PROCESS')) return 'pending';
    if (rawStatus.includes('FAIL') || rawStatus.includes('CANCEL') || rawStatus.includes('ERROR') || rawStatus.includes('INVALID')) return 'provider_error';
    return 'ambiguous';
}

export function isClubkonnectAuthFailure(input: any) {
    const classified = classifyClubkonnectOutcome(input);
    return classified === 'auth' || classified === 'auth_missing';
}

export function sanitizeClubkonnectBody(input: any) {
    if (input == null) return input;
    if (typeof input !== 'object') return String(input).slice(0, 500);
    const clone: Record<string, any> = { ...input };
    delete clone.APIKey;
    delete clone.UserID;
    delete clone.apiKey;
    delete clone.userid;
    for (const key of Object.keys(clone)) {
        if (/secret|password|token|authorization|api[_-]?key/i.test(key)) delete clone[key];
        if (/phone|mobile/i.test(key) && typeof clone[key] === 'string') clone[key] = '[redacted]';
    }
    return clone;
}

export function logClubkonnectCall(entry: {
    path: string;
    operation?: string;
    httpStatus?: number | null;
    durationMs?: number;
    body?: any;
    timeout?: boolean;
    errorMessage?: string | null;
    reference?: string | null;
    type?: string | null;
    network?: string | null;
    walletDebited?: boolean;
    refunded?: boolean;
    fulfillmentStatus?: string | null;
    providerOrderId?: string | null;
}) {
    const classified = classifyClubkonnectOutcome(entry.body, { timeout: entry.timeout });
    const payload = {
        path: entry.path,
        operation: entry.operation || entry.path,
        httpStatus: entry.httpStatus ?? null,
        durationMs: entry.durationMs ?? null,
        classification: classified,
        providerStatus: providerStatusText(entry.body) || null,
        providerStatusCode: entry.body?.statuscode || entry.body?.statusCode || entry.body?.code || null,
        providerOrderId: entry.providerOrderId || entry.body?.orderid || entry.body?.OrderID || null,
        reference: entry.reference || null,
        type: entry.type || null,
        network: entry.network || null,
        walletDebited: entry.walletDebited ?? null,
        refunded: entry.refunded ?? null,
        fulfillmentStatus: entry.fulfillmentStatus || null,
        timeout: Boolean(entry.timeout),
        errorMessage: entry.errorMessage ? String(entry.errorMessage).slice(0, 300) : null,
        sanitizedBody: sanitizeClubkonnectBody(entry.body),
    };
    const line = `[Clubkonnect] ${JSON.stringify(payload)}`;
    if (classified === 'auth' || classified === 'auth_missing' || classified === 'timeout' || classified === 'provider_error') {
        console.error(line);
    } else {
        console.info(line);
    }
    return classified;
}

export function mapProviderStatus(input: any): FulfillmentStatus {
    const statusCode = String(input?.statuscode || input?.statusCode || input?.code || '').trim();
    const rawStatus = String(input?.status || input?.orderstatus || input?.orderStatus || input?.response_description || '').trim().toUpperCase();

    if (statusCode === '200' || rawStatus === 'ORDER_COMPLETED' || rawStatus === 'SUCCESSFUL' || rawStatus === 'SUCCESS') {
        return 'SUCCESSFUL';
    }
    if (statusCode === '100' || rawStatus === 'ORDER_RECEIVED') return 'ORDER_RECEIVED';
    if (rawStatus.includes('ONHOLD') || rawStatus.includes('ON_HOLD')) return 'PENDING_PROVIDER';
    if (rawStatus.includes('PENDING') || rawStatus.includes('PROCESS')) return 'PENDING_PROVIDER';
    if (rawStatus.includes('CANCEL')) return 'CANCELLED';
    if (
        rawStatus.includes('FAIL') ||
        rawStatus.includes('DECLIN') ||
        rawStatus.includes('INVALID') ||
        rawStatus.includes('MISSING') ||
        rawStatus.includes('INSUFFICIENT') ||
        rawStatus.includes('ERROR') ||
        ['300', '400', '500'].includes(statusCode)
    ) {
        return 'REFUND_REQUIRED';
    }
    return statusCode || rawStatus ? 'PENDING_PROVIDER' : 'PROCESSING';
}
