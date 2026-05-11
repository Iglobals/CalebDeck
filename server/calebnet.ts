import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import axios from 'axios';
import { adminDb } from './firebase-admin.js';

export type CalebNetType = 'DATA' | 'AIRTIME';
export type CalebNetNetwork = 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
export type FulfillmentStatus =
    'NOT_STARTED' | 'PROCESSING' | 'ORDER_RECEIVED' | 'PENDING_PROVIDER' |
    'SUCCESSFUL' | 'FAILED' | 'REFUND_REQUIRED' | 'CANCELLED';

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

export function getClubkonnectConfig() {
    const userId = process.env.CLUBKONNECT_USER_ID;
    const apiKey = process.env.CLUBKONNECT_API_KEY;
    const baseUrl = (process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com').replace(/\/$/, '');
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

export function mapProviderStatus(input: any): FulfillmentStatus {
    const statusCode = String(input?.statuscode || input?.statusCode || input?.code || '').trim();
    const rawStatus = String(input?.status || input?.orderstatus || input?.orderStatus || input?.response_description || '').trim().toUpperCase();

    if (statusCode === '200' || rawStatus === 'ORDER_COMPLETED' || rawStatus === 'SUCCESSFUL' || rawStatus === 'SUCCESS') {
        return 'SUCCESSFUL';
    }
    if (statusCode === '100' || rawStatus === 'ORDER_RECEIVED') return 'ORDER_RECEIVED';
    if (rawStatus.includes('PENDING') || rawStatus.includes('PROCESS')) return 'PENDING_PROVIDER';
    if (rawStatus.includes('CANCEL')) return 'CANCELLED';
    if (rawStatus.includes('FAIL') || rawStatus.includes('DECLIN') || statusCode === '300' || statusCode === '400') {
        return 'REFUND_REQUIRED';
    }
    return statusCode || rawStatus ? 'PENDING_PROVIDER' : 'PROCESSING';
}

export function shouldPreserveSuccessful(current?: string, next?: string) {
    return current === 'SUCCESSFUL' && next !== 'SUCCESSFUL';
}

export async function clubkonnectGet(path: string, params: Record<string, any>, timeout = 20000) {
    const { baseUrl } = getClubkonnectConfig();
    const response = await axios.get(`${baseUrl}${path}`, { params, timeout });
    return response.data;
}

export async function updateProviderHealth(
    network: CalebNetNetwork,
    type: CalebNetType,
    outcome: 'success' | 'failure' | 'timeout',
    reason: string | null = null
) {
    const db = adminDb();
    const id = `clubkonnect_${type}_${network}`;
    const ref = db.collection('calebnet_provider_status').doc(id);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = snap.exists ? snap.data()! : {};
        const currentFailures = Number(current.failureCount || 0);
        const failureCount = outcome === 'success' ? 0 : currentFailures + 1;
        const status = outcome === 'success'
            ? 'HEALTHY'
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
            lastFailureReason: outcome === 'success' ? null : reason,
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
