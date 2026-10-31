import { createHash } from 'crypto';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin.js';

export const LOGS_COLLECTION = 'system_logs';
export const LOG_GROUPS_COLLECTION = 'system_log_groups';
export const INCIDENTS_COLLECTION = 'system_incidents';
export const HEALTH_COLLECTION = 'system_health';
export const HEALTH_DOC_ID = 'current';
export const ANNOUNCEMENTS_DOC = { collection: 'settings', id: 'customer_announcements' };
export const PAYMENT_RESOLUTION_ANNOUNCEMENT_ID = 'payment-issues-resolved-2026-10';

export type MonitoringSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type MonitoringCategory = 'payment' | 'order' | 'application';
export type MonitoringService = 'payment' | 'checkout' | 'order' | 'backend' | 'firebase' | 'frontend' | 'webhook' | 'api';
export type HealthStatus = 'operational' | 'degraded' | 'experiencing_issues' | 'unknown';
export type HealthBasis = 'measured' | 'inferred' | 'unknown';
export type IncidentStatus = 'open' | 'investigating' | 'resolved';

export interface LogEventInput {
    severity: MonitoringSeverity;
    category: MonitoringCategory;
    service: MonitoringService;
    eventType: string;
    humanTitle: string;
    humanSummary: string;
    suggestedAction?: string;
    errorMessage?: string;
    errorCode?: string;
    stack?: string;
    httpStatus?: number;
    endpoint?: string;
    component?: string;
    correlationId?: string;
    orderId?: string;
    paymentReference?: string;
    details?: Record<string, unknown>;
    persistDocument?: boolean;
}

const WINDOW_MS = 15 * 60 * 1000;
const RETENTION_DAYS = 14;
const SENSITIVE_KEY = /secret|password|token|authorization|api[_-]?key|card|cvv|pin|private[_-]?key|bearer/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\b(?:\+?234|0)[789][01]\d{8}\b/g;

const INCIDENT_RULES: Array<{
    eventTypes: string[];
    threshold: number;
    severity: MonitoringSeverity;
    title: string;
    service: MonitoringService;
}> = [
    { eventTypes: ['payment_init_failed', 'pre_save_failed'], threshold: 3, severity: 'critical', title: 'Customers cannot start checkout payments', service: 'payment' },
    { eventTypes: ['payment_verify_failed'], threshold: 3, severity: 'critical', title: 'Payment verification is failing', service: 'payment' },
    { eventTypes: ['paystack_api_error'], threshold: 3, severity: 'critical', title: 'Paystack API errors', service: 'payment' },
    { eventTypes: ['checkout_failed', 'invalid_checkout_payload', 'missing_hostel'], threshold: 5, severity: 'high', title: 'Checkout failures are elevated', service: 'checkout' },
    { eventTypes: ['webhook_failed'], threshold: 3, severity: 'high', title: 'Paystack webhook processing is failing', service: 'webhook' },
    { eventTypes: ['firebase_error'], threshold: 5, severity: 'high', title: 'Database operations are failing', service: 'firebase' },
    { eventTypes: ['api_failure', 'unhandled_exception'], threshold: 5, severity: 'high', title: 'Backend or application errors are elevated', service: 'backend' },
    { eventTypes: ['frontend_error', 'unhandled_rejection'], threshold: 10, severity: 'medium', title: 'Frontend errors are elevated', service: 'frontend' },
    { eventTypes: ['admin_test_event'], threshold: 3, severity: 'medium', title: 'Controlled monitoring test', service: 'backend' },
];

function envName() {
    return process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
}

function nowMs() {
    return Date.now();
}

function fingerprintOf(input: LogEventInput) {
    const normalised = String(input.errorCode || input.eventType || '')
        .toLowerCase()
        .replace(/\d+/g, '#')
        .slice(0, 80);
    const msg = String(input.errorMessage || input.humanTitle || '')
        .toLowerCase()
        .replace(/\d+/g, '#')
        .slice(0, 80);
    return createHash('sha1')
        .update([input.service, input.eventType, normalised, msg].join('|'))
        .digest('hex')
        .slice(0, 16);
}

function redactValue(value: unknown, key = ''): unknown {
    if (SENSITIVE_KEY.test(key)) return '[redacted]';
    if (typeof value === 'string') {
        if (value.length > 2000) return `${value.slice(0, 2000)}…`;
        return value.replace(EMAIL_RE, '[email]').replace(PHONE_RE, '[phone]');
    }
    if (Array.isArray(value)) return value.slice(0, 20).map((item, i) => redactValue(item, String(i)));
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
            out[k] = redactValue(v, k);
        }
        return out;
    }
    return value;
}

function sanitizeDetails(details?: Record<string, unknown>) {
    if (!details) return {};
    return redactValue(details) as Record<string, unknown>;
}

function truncate(value: unknown, max = 1500) {
    const text = String(value || '');
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

function emptyServiceHealth() {
    return {
        status: 'unknown' as HealthStatus,
        basis: 'unknown' as HealthBasis,
        lastSuccessAt: null as number | null,
        lastFailureAt: null as number | null,
        recentSuccesses: 0,
        recentFailures: 0,
        note: 'Not enough measured events yet.',
    };
}

async function withTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<null>((resolve) => {
                timer = setTimeout(() => resolve(null), ms);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

function deriveServiceStatus(successes: number, failures: number, lastSuccessAt: number | null, lastFailureAt: number | null) {
    const now = nowMs();
    const recentFailure = lastFailureAt && now - lastFailureAt < WINDOW_MS;
    const recentSuccess = lastSuccessAt && now - lastSuccessAt < 2 * 60 * 60 * 1000;

    if (failures >= 3 && successes === 0 && recentFailure) {
        return { status: 'experiencing_issues' as HealthStatus, basis: 'measured' as HealthBasis, note: 'Repeated failures with no recent successes.' };
    }
    if (failures > 0 && successes > 0 && recentFailure) {
        return { status: 'degraded' as HealthStatus, basis: 'measured' as HealthBasis, note: 'Successes and failures are both occurring.' };
    }
    if (recentSuccess && !recentFailure) {
        return { status: 'operational' as HealthStatus, basis: 'measured' as HealthBasis, note: 'Recent successful measured operations.' };
    }
    if (recentFailure) {
        return { status: 'experiencing_issues' as HealthStatus, basis: 'measured' as HealthBasis, note: 'Recent measured failures.' };
    }
    return { status: 'unknown' as HealthStatus, basis: 'unknown' as HealthBasis, note: 'No recent measured events.' };
}

function overallFrom(services: Record<string, { status: HealthStatus }>): HealthStatus {
    const values = Object.values(services).map((s) => s.status);
    if (values.includes('experiencing_issues')) return 'experiencing_issues';
    if (values.includes('degraded')) return 'degraded';
    if (values.some((v) => v === 'operational')) {
        return values.every((v) => v === 'operational' || v === 'unknown') ? 'operational' : 'degraded';
    }
    return 'unknown';
}

async function maybePrune(db: Firestore) {
    if (Math.random() > 0.05) return;
    const cutoff = Timestamp.fromMillis(nowMs() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const snap = await db.collection(LOGS_COLLECTION).where('createdAt', '<', cutoff).limit(50).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
}

async function notifyAdmins(db: Firestore, incidentId: string, title: string, message: string) {
    const existing = await db.collection('notifications')
        .where('userId', '==', 'admin')
        .where('incidentId', '==', incidentId)
        .limit(1)
        .get()
        .catch(() => null);
    if (existing && !existing.empty) return;

    await db.collection('notifications').add({
        userId: 'admin',
        title,
        message,
        type: 'incident',
        link: `/admin/monitoring?incident=${incidentId}`,
        incidentId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
    });
}

async function updateIncident(db: Firestore, input: LogEventInput, fingerprint: string, groupCount: number) {
    const rule = INCIDENT_RULES.find((r) => r.eventTypes.includes(input.eventType));
    if (!rule || groupCount < rule.threshold) return null;
    if (input.severity === 'info' || input.severity === 'low') return null;

    const incidentRef = db.collection(INCIDENTS_COLLECTION).doc(`inc_${fingerprint}`);
    const existing = await incidentRef.get();
    const payload = {
        title: rule.title,
        severity: rule.severity,
        service: rule.service,
        fingerprint,
        eventType: input.eventType,
        lastDetectedAt: FieldValue.serverTimestamp(),
        affectedEvents: groupCount,
        relatedLogPreview: {
            humanTitle: input.humanTitle,
            errorCode: input.errorCode || null,
            paymentReference: input.paymentReference || null,
            orderId: input.orderId || null,
        },
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (!existing.exists) {
        await incidentRef.set({
            ...payload,
            status: 'open' as IncidentStatus,
            firstDetectedAt: FieldValue.serverTimestamp(),
            resolutionNotes: '',
            adminNotified: true,
        });
        await notifyAdmins(
            db,
            incidentRef.id,
            rule.title,
            input.humanSummary || 'A critical platform issue was detected. Open System Health for details.'
        );
        return incidentRef.id;
    }

    const data = existing.data() || {};
    if (data.status === 'resolved') {
        await incidentRef.set({
            ...payload,
            status: 'open',
            reopenedAt: FieldValue.serverTimestamp(),
            adminNotified: true,
        }, { merge: true });
        await notifyAdmins(
            db,
            incidentRef.id,
            `Recurring: ${rule.title}`,
            'A previously resolved incident is happening again.'
        );
        return incidentRef.id;
    }

    await incidentRef.set(payload, { merge: true });
    return incidentRef.id;
}

async function updateHealth(db: Firestore, input: LogEventInput) {
    const healthRef = db.collection(HEALTH_COLLECTION).doc(HEALTH_DOC_ID);
    const snap = await healthRef.get();
    const current = snap.exists ? snap.data() || {} : {};
    const services = {
        payment: { ...emptyServiceHealth(), ...(current.services?.payment || {}) },
        checkout: { ...emptyServiceHealth(), ...(current.services?.checkout || {}) },
        order: { ...emptyServiceHealth(), ...(current.services?.order || {}) },
        backend: { ...emptyServiceHealth(), ...(current.services?.backend || {}) },
        firebase: { ...emptyServiceHealth(), ...(current.services?.firebase || {}) },
    };

    const isFailure = ['critical', 'high', 'medium'].includes(input.severity) && /fail|error|invalid|mismatch/i.test(input.eventType);
    const isSuccess = /success|verified|paid/.test(input.eventType);
    const target =
        input.service === 'payment' || input.service === 'webhook' ? 'payment'
            : input.service === 'checkout' ? 'checkout'
                : input.service === 'order' ? 'order'
                    : input.service === 'firebase' ? 'firebase'
                        : 'backend';

    const now = nowMs();
    if (isSuccess) {
        services[target].recentSuccesses = Number(services[target].recentSuccesses || 0) + 1;
        services[target].lastSuccessAt = now;
    }
    if (isFailure) {
        services[target].recentFailures = Number(services[target].recentFailures || 0) + 1;
        services[target].lastFailureAt = now;
    }

    const firebaseFailed = input.service === 'firebase' || /firestore|firebase/i.test(String(input.errorMessage || input.eventType || ''));
    if (firebaseFailed && isFailure) {
        services.firebase.recentFailures = Number(services.firebase.recentFailures || 0) + 1;
        services.firebase.lastFailureAt = now;
    } else {
        services.firebase.recentSuccesses = Number(services.firebase.recentSuccesses || 0) + 1;
        services.firebase.lastSuccessAt = now;
    }

    if (input.eventType.startsWith('pre_save') || input.eventType.startsWith('order_')) {
        if (isSuccess) {
            services.order.recentSuccesses = Number(services.order.recentSuccesses || 0) + 1;
            services.order.lastSuccessAt = now;
        }
        if (isFailure) {
            services.order.recentFailures = Number(services.order.recentFailures || 0) + 1;
            services.order.lastFailureAt = now;
        }
    }

    if (input.service !== 'frontend') {
        if (isFailure && (input.service === 'backend' || input.eventType === 'api_failure' || input.eventType === 'unhandled_exception')) {
            services.backend.recentFailures = Number(services.backend.recentFailures || 0) + 1;
            services.backend.lastFailureAt = now;
        } else if (isSuccess) {
            services.backend.recentSuccesses = Number(services.backend.recentSuccesses || 0) + 1;
            services.backend.lastSuccessAt = now;
        }
    }

    for (const key of Object.keys(services) as Array<keyof typeof services>) {
        const derived = deriveServiceStatus(
            Number(services[key].recentSuccesses || 0),
            Number(services[key].recentFailures || 0),
            services[key].lastSuccessAt || null,
            services[key].lastFailureAt || null
        );
        services[key] = { ...services[key], ...derived };
    }

    const paymentCounters = {
        failedInitCount: Number(current.failedInitCount || 0) + (input.eventType === 'payment_init_failed' || input.eventType === 'pre_save_failed' ? 1 : 0),
        failedVerifyCount: Number(current.failedVerifyCount || 0) + (input.eventType === 'payment_verify_failed' ? 1 : 0),
        lastSuccessfulPaymentAt: input.eventType === 'payment_verify_success'
            ? now
            : current.lastSuccessfulPaymentAt || null,
        lastSuccessfulPreSaveAt: input.eventType === 'pre_save_success'
            ? now
            : current.lastSuccessfulPreSaveAt || null,
        recentErrorCount: Number(current.recentErrorCount || 0) + (isFailure ? 1 : 0),
        criticalErrorCount: Number(current.criticalErrorCount || 0) + (input.severity === 'critical' ? 1 : 0),
    };

    await healthRef.set({
        overall: overallFrom(services),
        overallBasis: 'measured',
        services,
        ...paymentCounters,
        environment: envName(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}

export async function ensurePaymentResolutionAnnouncement(published: boolean) {
    try {
        const db = adminDb();
        const ref = db.collection(ANNOUNCEMENTS_DOC.collection).doc(ANNOUNCEMENTS_DOC.id);
        const snap = await ref.get();
        const items = Array.isArray(snap.data()?.items) ? snap.data()!.items : [];
        const existing = items.find((item: any) => item.id === PAYMENT_RESOLUTION_ANNOUNCEMENT_ID);
        if (existing) {
            if (published && !existing.published && !existing.unpublishedByAdmin) {
                const next = items.map((item: any) => item.id === PAYMENT_RESOLUTION_ANNOUNCEMENT_ID
                    ? { ...item, published: true, publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
                    : item);
                await ref.set({ items: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            }
            return;
        }
        items.unshift({
            id: PAYMENT_RESOLUTION_ANNOUNCEMENT_ID,
            title: 'Payment Issues Resolved',
            body: "We're sorry for the inconvenience caused by the payment issues some of you experienced over the past few days.\n\nThe issue has now been resolved, and you can continue placing orders and making payments on CalebDeck.\n\nThank you for your patience and for bearing with us. We appreciate you!",
            published,
            dismissible: true,
            audience: 'all',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: published ? new Date().toISOString() : null,
        });
        await ref.set({ items, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (error) {
        console.warn('[monitoring] Could not upsert customer announcement:', error);
    }
}

async function writeEvent(input: LogEventInput) {
    const db = adminDb();
    const fingerprint = fingerprintOf(input);
    const infoKeep = input.severity === 'info' && /fail|error|mismatch|duplicate/.test(input.eventType);
    const shouldWriteDoc = input.persistDocument === false
        ? false
        : (input.severity !== 'info' || infoKeep);

    const groupRef = db.collection(LOG_GROUPS_COLLECTION).doc(fingerprint);
    const groupSnap = await groupRef.get();
    const previousCount = Number(groupSnap.data()?.occurrenceCount || 0);
    const occurrenceCount = previousCount + 1;
    await groupRef.set({
        fingerprint,
        severity: input.severity,
        category: input.category,
        service: input.service,
        eventType: input.eventType,
        humanTitle: input.humanTitle,
        humanSummary: input.humanSummary,
        suggestedAction: input.suggestedAction || '',
        lastErrorMessage: truncate(input.errorMessage || '', 500),
        lastErrorCode: input.errorCode || null,
        occurrenceCount,
        firstOccurredAt: groupSnap.exists ? groupSnap.data()?.firstOccurredAt : FieldValue.serverTimestamp(),
        lastOccurredAt: FieldValue.serverTimestamp(),
        lastOrderId: input.orderId || null,
        lastPaymentReference: input.paymentReference || null,
        environment: envName(),
        ongoing: ['critical', 'high', 'medium'].includes(input.severity),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    let logId: string | null = null;
    if (shouldWriteDoc) {
        const logRef = db.collection(LOGS_COLLECTION).doc();
        logId = logRef.id;
        await logRef.set({
            eventId: logRef.id,
            fingerprint,
            createdAt: FieldValue.serverTimestamp(),
            timestampMs: nowMs(),
            environment: envName(),
            severity: input.severity,
            category: input.category,
            service: input.service,
            eventType: input.eventType,
            humanTitle: input.humanTitle,
            humanSummary: input.humanSummary,
            suggestedAction: input.suggestedAction || '',
            errorMessage: truncate(redactValue(input.errorMessage || '') as string, 1500),
            errorCode: input.errorCode || null,
            stack: truncate(input.stack || '', 4000),
            httpStatus: input.httpStatus || null,
            endpoint: input.endpoint || null,
            component: input.component || null,
            correlationId: input.correlationId || null,
            orderId: input.orderId || null,
            paymentReference: input.paymentReference || null,
            details: sanitizeDetails(input.details),
            occurrenceCount,
        });
    }

    const incidentId = await updateIncident(db, input, fingerprint, occurrenceCount);
    await updateHealth(db, input);
    await maybePrune(db);
    return { fingerprint, logId, incidentId, occurrenceCount };
}

export async function recordEvent(input: LogEventInput) {
    try {
        await withTimeout(writeEvent(input), 1800);
    } catch (error) {
        console.warn('[monitoring] recordEvent failed:', error);
    }
}

export function monitoringFromError(error: any) {
    const message = truncate(error?.message || error?.code || 'Unknown error', 500);
    const stack = truncate(error?.stack || '', 4000);
    const httpStatus = Number(error?.response?.status || error?.status || 0) || undefined;
    const errorCode = String(error?.code || error?.response?.data?.code || error?.name || '') || undefined;
    return { message, stack, httpStatus, errorCode };
}
