import { adminDb, getFirebaseAdminEnvDiagnostics } from './firebase-admin.js';
import { recordEvent } from './monitoring.js';
import { recordAlertingStatus, sendTelegramAlert, telegramCredentialsPresent } from './telegram.js';

export type HealthCheckSource = 'cron' | 'github' | 'admin';

export interface ProbeResult {
    ok: boolean;
    latencyMs: number;
    note: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: string; latencyMs: number }> {
    const started = Date.now();
    try {
        const value = await fn();
        return { value, latencyMs: Date.now() - started };
    } catch (error: any) {
        return { error: String(error?.message || 'probe_failed').slice(0, 180), latencyMs: Date.now() - started };
    }
}

function mapIncidentServiceToCheck(service: string): 'payment' | 'order' | 'database' | 'api' | null {
    if (service === 'payment' || service === 'webhook') return 'payment';
    if (service === 'checkout' || service === 'order') return 'order';
    if (service === 'firebase') return 'database';
    if (service === 'backend' || service === 'api') return 'api';
    return null;
}

async function maybeNotifyRecovery(checks: Record<string, ProbeResult>) {
    try {
        const snap = await adminDb()
            .collection('system_incidents')
            .orderBy('lastDetectedAt', 'desc')
            .limit(40)
            .get();

        for (const doc of snap.docs) {
            const data = doc.data() || {};
            if (data.status !== 'open' && data.status !== 'investigating') continue;
            const checkKey = mapIncidentServiceToCheck(String(data.service || ''));
            if (!checkKey) continue;
            const probe = checks[checkKey];
            if (!probe?.ok) continue;

            void sendTelegramAlert({
                kind: 'recovery',
                severity: String(data.severity || 'high'),
                service: String(data.service || checkKey),
                title: String(data.title || 'Service recovered'),
                summary: `Scheduled health checks confirm ${checkKey} is responding again. The incident stays open until an admin marks it resolved.`,
                incidentId: doc.id,
                fingerprint: String(data.fingerprint || doc.id),
                occurrenceCount: Number(data.affectedEvents || 0) || undefined,
            }).catch(() => {});
        }
    } catch {
        // Recovery notices must never fail the health check.
    }
}

export async function runScheduledHealthCheck(source: HealthCheckSource) {
    const started = Date.now();
    const checks: Record<string, ProbeResult> = {};

    checks.api = {
        ok: true,
        latencyMs: 0,
        note: 'The health-check handler is running on the CalebDeck API.',
    };

    const firebaseDiag = getFirebaseAdminEnvDiagnostics();
    const dbProbe = await timed(async () => {
        if (!firebaseDiag.ok) {
            throw new Error(firebaseDiag.error || 'Firebase Admin is not configured');
        }
        await adminDb().collection('system_health').doc('current').get();
        return true;
    });
    checks.database = {
        ok: !dbProbe.error,
        latencyMs: dbProbe.latencyMs,
        note: dbProbe.error
            ? `Database connectivity failed: ${dbProbe.error}`
            : 'Firestore responded to a read of the health document.',
    };
    if (!checks.database.ok) {
        await recordEvent({
            severity: 'high',
            category: 'application',
            service: 'firebase',
            eventType: 'firebase_error',
            humanTitle: 'Scheduled health check could not read Firestore',
            humanSummary: 'The database probe failed. Checkout may also be unable to write orders.',
            suggestedAction: 'Confirm Firebase Admin environment variables on Vercel and Firestore availability.',
            errorMessage: dbProbe.error,
            endpoint: '/api/utils/health-check',
            component: 'health-check',
        });
    }

    const orderProbe = await timed(async () => {
        const snap = await adminDb().collection('hostels').limit(1).get();
        return snap.size;
    });
    checks.order = {
        ok: !orderProbe.error,
        latencyMs: orderProbe.latencyMs,
        note: orderProbe.error
            ? `Order data probe failed: ${orderProbe.error}`
            : 'Hostel/order configuration is readable. No customer order was created.',
    };
    if (!checks.order.ok) {
        await recordEvent({
            severity: 'high',
            category: 'order',
            service: 'order',
            eventType: 'api_failure',
            humanTitle: 'Scheduled health check could not read order configuration',
            humanSummary: 'The order service probe failed while reading hostel data.',
            suggestedAction: 'Inspect Firestore hostels access and recent order API errors.',
            errorMessage: orderProbe.error,
            endpoint: '/api/utils/health-check',
            component: 'health-check',
        });
    }

    const secret = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secret) {
        checks.payment = {
            ok: false,
            latencyMs: 0,
            note: 'PAYSTACK_SECRET_KEY is not configured. No customer charge was attempted.',
        };
        await recordEvent({
            severity: 'critical',
            category: 'payment',
            service: 'payment',
            eventType: 'paystack_api_error',
            humanTitle: 'Paystack secret key is missing on the server',
            humanSummary: 'Payment verification cannot run until PAYSTACK_SECRET_KEY is set in Vercel.',
            suggestedAction: 'Add PAYSTACK_SECRET_KEY to Vercel environment variables and redeploy.',
            errorCode: 'PAYSTACK_SECRET_MISSING',
            endpoint: '/api/utils/health-check',
            component: 'health-check',
        });
    } else {
        const payProbe = await timed(async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            try {
                const res = await fetch('https://api.paystack.co/bank?perPage=1', {
                    headers: { Authorization: `Bearer ${secret}` },
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`Paystack HTTP ${res.status}`);
                return true;
            } finally {
                clearTimeout(timer);
            }
        });
        checks.payment = {
            ok: !payProbe.error,
            latencyMs: payProbe.latencyMs,
            note: payProbe.error
                ? `Paystack readiness check failed: ${payProbe.error}`
                : 'Paystack accepted a read-only bank list request. No customer charge was made.',
        };
        if (!checks.payment.ok) {
            await recordEvent({
                severity: 'critical',
                category: 'payment',
                service: 'payment',
                eventType: 'paystack_api_error',
                humanTitle: 'Paystack readiness check failed',
                humanSummary: 'The scheduled health check could not reach Paystack with a non-charging request.',
                suggestedAction: 'Confirm PAYSTACK_SECRET_KEY and Paystack API status. Do not run live charges from health checks.',
                errorMessage: payProbe.error,
                endpoint: '/api/utils/health-check',
                component: 'health-check',
            });
        }
    }

    const allOk = Object.values(checks).every((item) => item.ok);
    const now = Date.now();
    const summary = Object.entries(checks).map(([key, value]) => `${key}:${value.ok ? 'ok' : 'fail'}`).join(', ');

    await recordAlertingStatus({
        lastHealthCheckAt: now,
        lastHealthCheckOk: allOk,
        lastHealthCheckSource: source,
        lastHealthCheckSummary: summary,
        lastHealthCheckResults: checks,
        ...(allOk ? { lastSuccessfulHealthCheckAt: now } : {}),
        telegramConfigured: telegramCredentialsPresent().configured,
    });

    if (Object.values(checks).some((item) => item.ok)) {
        await maybeNotifyRecovery(checks);
    }

    return {
        ok: allOk,
        source,
        durationMs: Date.now() - started,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
        checks,
        chargedCustomer: false,
    };
}
