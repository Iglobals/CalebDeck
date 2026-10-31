import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin.js';

import type { FulfillmentStatus } from './calebnet-status.js';
import { logClubkonnectCall } from './calebnet-status.js';

export type { ClubkonnectOutcomeClass, FulfillmentStatus } from './calebnet-status.js';
export {
    classifyClubkonnectOutcome,
    isClubkonnectAuthFailure,
    logClubkonnectCall,
    mapProviderStatus,
    providerStatusText,
    sanitizeClubkonnectBody,
} from './calebnet-status.js';

export type CalebNetType = 'DATA' | 'AIRTIME';
export type CalebNetNetwork = 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';

export const NETWORK_CODES: Record<CalebNetNetwork, string> = {
    MTN: '01',
    GLO: '02',
    '9MOBILE': '03',
    AIRTEL: '04',
};

const NETWORK_ALIASES: Record<string, CalebNetNetwork> = {
    MTN: 'MTN',
    GLO: 'GLO',
    AIRTEL: 'AIRTEL',
    '9MOBILE': '9MOBILE',
    ETISALAT: '9MOBILE',
};

export function setCors(res: VercelResponse, methods = 'GET, POST, PATCH, OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://calebdeck.com');
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function normalizeType(type: unknown): CalebNetType | null {
    const value = String(type || '').trim().toUpperCase();
    return value === 'DATA' || value === 'AIRTIME' ? value : null;
}

export function normalizeNetwork(network: unknown): CalebNetNetwork | null {
    const value = String(network || '').trim().toUpperCase().replace(/[\s_-]/g, '');
    return NETWORK_ALIASES[value] || null;
}

export function isValidNigerianPhone(phone: string) {
    return /^0[789][01]\d{8}$/.test(phone);
}

function cleanCredential(value: string | undefined): string {
    return String(value || '').trim().replace(/^["']|["']$/g, '').trim();
}

export function getClubkonnectConfig() {
    const userId = cleanCredential(process.env.CLUBKONNECT_USER_ID);
    const apiKey = cleanCredential(process.env.CLUBKONNECT_API_KEY);
    const baseUrl = cleanCredential(process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com').replace(/\/$/, '');
    if (!userId || !apiKey) throw new Error('Clubkonnect credentials are not configured');
    return { userId, apiKey, baseUrl };
}

export function makeRequestId(paymentReference: string) {
    const clean = paymentReference.replace(/[^a-zA-Z0-9]/g, '').slice(-14).toUpperCase();
    return `CDNET-${Date.now()}-${clean}`;
}

export function safePayload(payload: Record<string, any>) {
    const clone = { ...payload };
    delete clone.APIKey;
    delete clone.UserID;
    delete clone.apiKey;
    // Strip undefined values — Firestore rejects them
    for (const key of Object.keys(clone)) {
        if (clone[key] === undefined) delete clone[key];
    }
    return clone;
}

export function shouldPreserveSuccessful(current?: string, next?: string) {
    return current === 'SUCCESSFUL' && next !== 'SUCCESSFUL';
}

export function providerHealthOutcomeForStatus(status: FulfillmentStatus): 'success' | 'failure' | 'timeout' | 'pending' {
    if (status === 'SUCCESSFUL') return 'success';
    if (status === 'FAILED' || status === 'REFUND_REQUIRED' || status === 'CANCELLED' || status === 'REFUNDED') return 'failure';
    if (status === 'PENDING_PROVIDER') return 'timeout';
    return 'pending';
}

export function isRefundableProviderStatus(status: FulfillmentStatus) {
    return status === 'FAILED' || status === 'REFUND_REQUIRED' || status === 'CANCELLED' || status === 'REFUNDED';
}

export function providerInvalidPlanReason(input: any) {
    const parts = [
        input?.status,
        input?.orderstatus,
        input?.remark,
        input?.orderremark,
        input?.message,
        input?.response_description,
        input?.callback?.orderremark,
        input?.callback?.remark,
    ];
    const text = parts.filter(Boolean).join(' ').toLowerCase();
    if (!text) return null;
    const mentionsPlan = text.includes('plan') || text.includes('dataplan') || text.includes('data plan');
    const invalid = text.includes('not valid') || text.includes('invalid') || text.includes('missing_dataplan');
    return mentionsPlan && invalid ? parts.filter(Boolean).join(' ') : null;
}

export async function disableCatalogPlanAfterProviderRejection(order: any, reason: string | null) {
    const planId = String(order?.planId || '').trim();
    if (!planId || !reason) return;
    await adminDb().collection('calebnet_catalog').doc(planId).set({
        isActive: false,
        providerDisabled: true,
        disabledReason: reason,
        disabledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}

export async function clubkonnectGet(path: string, params: Record<string, any>, timeout = 20000) {
    const { baseUrl } = getClubkonnectConfig();
    const targetUrl = new URL(path.startsWith('/') ? path : `/${path}`, `${baseUrl}/`);
    for (const [key, value] of Object.entries(params || {})) {
        if (value !== undefined && value !== null) {
            targetUrl.searchParams.set(key, String(value));
        }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const started = Date.now();
    try {
        const response = await fetch(targetUrl.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json, text/plain, */*' },
            signal: controller.signal,
        });
        const rawText = await response.text();
        let parsedData: any = rawText;
        try {
            parsedData = rawText ? JSON.parse(rawText) : {};
        } catch {
            parsedData = rawText;
        }
        logClubkonnectCall({
            path,
            httpStatus: response.status,
            durationMs: Date.now() - started,
            body: parsedData,
        });
        if (!response.ok) {
            const httpErr: any = new Error(`Clubkonnect HTTP ${response.status}`);
            httpErr.response = { status: response.status, data: parsedData };
            throw httpErr;
        }
        return parsedData;
    } catch (err: any) {
        if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
            logClubkonnectCall({
                path,
                durationMs: Date.now() - started,
                timeout: true,
                errorMessage: 'Clubkonnect request timed out',
            });
            const timeoutErr: any = new Error('Clubkonnect request timed out');
            timeoutErr.code = 'ECONNABORTED';
            throw timeoutErr;
        }
        if (!err?.response) {
            logClubkonnectCall({
                path,
                durationMs: Date.now() - started,
                errorMessage: err?.message || 'Clubkonnect request failed',
            });
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

export async function updateProviderHealth(
    network: CalebNetNetwork,
    type: CalebNetType,
    outcome: 'success' | 'failure' | 'timeout' | 'pending',
    reason: string | null = null
) {
    const db = adminDb();
    const id = `clubkonnect_${type}_${network}`;
    const ref = db.collection('calebnet_provider_status').doc(id);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = snap.exists ? snap.data()! : {};
        const currentFailures = Number(current.failureCount || 0);
        const failureCount = outcome === 'success'
            ? 0
            : outcome === 'pending'
                ? currentFailures
                : currentFailures + 1;
        const status = outcome === 'success'
            ? 'HEALTHY'
            : outcome === 'pending'
                ? (current.status || 'HEALTHY')
            : failureCount >= 5
                ? 'DOWN'
                : failureCount >= 3
                    ? 'DEGRADED'
                    : (current.status || 'HEALTHY');

        tx.set(ref, {
            provider: 'clubkonnect',
            network,
            type,
            status,
            failureCount,
            lastChecked: FieldValue.serverTimestamp(),
            lastFailureReason: outcome === 'success' ? null : (reason || current.lastFailureReason || null),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    });
}

export async function requireAdmin(req: VercelRequest) {
    const { getAuth } = await import('firebase-admin/auth');
    const db = adminDb();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;

    const decoded = await getAuth().verifyIdToken(authHeader.replace('Bearer ', ''));
    const user = await db.collection('users').doc(decoded.uid).get();
    if (!user.exists || user.data()?.role !== 'ADMIN') return null;
    return { uid: decoded.uid, email: decoded.email };
}

export function parseDate(value: any) {
    if (value instanceof Timestamp) return value.toDate();
    if (value?.seconds) return new Date(value.seconds * 1000);
    return value ? new Date(value) : null;
}
