/// <reference types="vite/client" />
import { toast } from 'react-toastify';

export const WALLET_FUNDING_MIN = 100;
export const WALLET_FUNDING_MAX = 50000;

export function createFundingReference() {
    return `CD-FUND-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export interface VerifyFundingResult {
    /**
     * success — Paystack confirmed the charge and the wallet is credited.
     * pending — Paystack has not confirmed yet (bank transfer / USSD lag) or the
     *           verify endpoint is unreachable. The wallet onSnapshot picks up the
     *           webhook credit automatically; callers must show a NEUTRAL toast.
     * failed  — definitive rejection (charge failed, email mismatch, amount out of range).
     */
    status: 'success' | 'pending' | 'failed';
    balance?: number;
    message?: string;
}

interface VerifyEndpointOutcome {
    httpStatus: number;
    data: any;
}

async function callVerifyFundingEndpoint(reference: string, token: string): Promise<VerifyEndpointOutcome> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch('/api/wallet/verify-funding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ reference }),
            signal: controller.signal,
        });
        let data: any = null;
        try { data = await response.json(); } catch { /* non-JSON body */ }
        // Log exactly what verification received — trace the real condition, never guess.
        console.info('[walletFunding] verify response:', {
            reference,
            httpStatus: response.status,
            paystackStatus: data?.paystackStatus ?? null,
            error: data?.error ?? null,
        });
        return { httpStatus: response.status, data };
    } finally {
        clearTimeout(timeout);
    }
}

const RETRYABLE_HTTP = new Set([202, 404, 429, 500, 502, 503, 504]);

/**
 * Single shared wallet-funding verification used by WalletPage and CalebNet.
 * Never throws — every terminal outcome resolves to success/pending/failed so a
 * toast always fires. Retries transient states for ~20s, then reports 'pending'
 * instead of erroring (the webhook still credits and the wallet onSnapshot
 * refreshes the balance).
 */
export async function verifyFunding(reference: string, token: string): Promise<VerifyFundingResult> {
    if (import.meta.env.DEV) {
        console.info('[walletFunding] DEV mock: treating funding as successful');
        return { status: 'success', balance: 0 };
    }

    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY_MS = 4000;
    let lastMessage = 'Verification unavailable';

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
            const { httpStatus, data } = await callVerifyFundingEndpoint(reference, token);
            // Success requires an explicit success payload — 202 (pending) must
            // never be read as success just because it's in the 2xx range.
            if (httpStatus === 200 && data?.success === true) {
                return { status: 'success', balance: Number(data?.balance || 0) };
            }
            const err = String(data?.error || '');
            const paystackStatus = String(data?.paystackStatus || '');

            // Definitive failures — retrying cannot change the outcome.
            if (paystackStatus === 'failed' || (httpStatus === 400 && /not successful/i.test(err))) {
                return { status: 'failed', message: err || 'Payment was not successful' };
            }
            if (httpStatus === 403 || (httpStatus === 400 && /between/i.test(err))) {
                return { status: 'failed', message: err };
            }

            // Transient (pending status, 5xx, network) — keep retrying.
            if (!RETRYABLE_HTTP.has(httpStatus)) {
                // Unknown non-retryable shape — surface it rather than masking as pending.
                return { status: 'failed', message: err || `Verification failed (HTTP ${httpStatus})` };
            }
            lastMessage = err || `Paystack status: ${paystackStatus || 'unknown'} (HTTP ${httpStatus})`;
        } catch (e: any) {
            lastMessage = e?.message || 'Network error during verification';
        }
        if (attempt < MAX_ATTEMPTS - 1) {
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
    }
    return { status: 'pending', message: lastMessage };
}

/** Shared toast handling for a verification outcome. */
export function announceFundingResult(result: VerifyFundingResult, setBalance?: (n: number) => void) {
    if (result.status === 'success') {
        setBalance?.(result.balance ?? 0);
        toast.success(`Wallet funded. New balance: ₦${Number(result.balance ?? 0).toLocaleString()}`);
        return;
    }
    if (result.status === 'pending') {
        toast.info('Your payment is still being confirmed. Your balance updates automatically once confirmed — please do not pay again.');
        return;
    }
    toast.error(result.message || 'Wallet funding could not be verified.');
}

/** Client-side guard mirroring the server's funding limits. */
export function validateFundingAmount(amount: number): string | null {
    if (!Number.isFinite(amount) || amount < WALLET_FUNDING_MIN) {
        return `Minimum funding amount is ₦${WALLET_FUNDING_MIN.toLocaleString()}`;
    }
    if (amount > WALLET_FUNDING_MAX) {
        return `Maximum funding amount is ₦${WALLET_FUNDING_MAX.toLocaleString()}`;
    }
    return null;
}
