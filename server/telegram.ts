import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin.js';

export const HEALTH_COLLECTION = 'system_health';
export const ALERTING_DOC_ID = 'alerting';
export const TELEGRAM_COOLDOWN_MS = 30 * 60 * 1000;
export const TELEGRAM_FAILURE_RETRY_MS = 2 * 60 * 1000;

export type TelegramAlertKind = 'open' | 'reopen' | 'update' | 'recovery' | 'test';

function envName() {
    return process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
}

export function publicAppUrl() {
    const raw = String(process.env.PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'https://calebdeck.com').trim();
    const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`;
    return withProtocol.replace(/\/$/, '');
}

export function telegramCredentialsPresent() {
    const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = String(process.env.TELEGRAM_ALERT_CHAT_ID || '').trim();
    return {
        tokenPresent: token.length > 0,
        chatIdPresent: chatId.length > 0,
        configured: token.length > 0 && chatId.length > 0,
    };
}

export function cronSecretConfigured() {
    return String(process.env.CRON_SECRET || process.env.MONITORING_CRON_SECRET || '').trim().length > 0;
}

export function sanitizeTelegramError(message: unknown) {
    const token = String(process.env.TELEGRAM_BOT_TOKEN || '');
    let text = String(message || 'telegram_request_failed').slice(0, 300);
    if (token) text = text.split(token).join('[redacted]');
    return text.replace(/bot\d+:[A-Za-z0-9_-]+/gi, 'bot[redacted]');
}

function formatWat(ms: number) {
    return new Date(ms).toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export async function recordAlertingStatus(patch: Record<string, unknown>) {
    try {
        const creds = telegramCredentialsPresent();
        await adminDb().collection(HEALTH_COLLECTION).doc(ALERTING_DOC_ID).set({
            telegramConfigured: creds.configured,
            telegramTokenPresent: creds.tokenPresent,
            telegramChatIdPresent: creds.chatIdPresent,
            cronSecretConfigured: cronSecretConfigured(),
            cronSchedule: '0 7 * * *',
            cronPlan: 'hobby_daily',
            environment: envName(),
            updatedAt: FieldValue.serverTimestamp(),
            ...patch,
        }, { merge: true });
    } catch {
        console.warn('[alerting] Could not persist alerting status');
    }
}

async function postTelegram(text: string): Promise<{ ok: boolean; reason?: string }> {
    const creds = telegramCredentialsPresent();
    if (!creds.configured) return { ok: false, reason: 'not_configured' };

    const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = String(process.env.TELEGRAM_ALERT_CHAT_ID || '').trim();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text.slice(0, 3500),
                disable_web_page_preview: true,
            }),
            signal: controller.signal,
        });
        const data = await res.json().catch(() => ({} as { ok?: boolean; description?: string }));
        if (!res.ok || data.ok === false) {
            return { ok: false, reason: sanitizeTelegramError(data.description || `HTTP ${res.status}`) };
        }
        return { ok: true };
    } catch (error: any) {
        return { ok: false, reason: sanitizeTelegramError(error?.message || 'telegram_request_failed') };
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export function formatIncidentAlert(input: {
    kind: TelegramAlertKind;
    severity: string;
    service: string;
    title: string;
    summary: string;
    firstDetectedAt?: string;
    occurrenceCount?: number;
    incidentId?: string;
}) {
    const kindLabel: Record<TelegramAlertKind, string> = {
        open: 'INCIDENT',
        reopen: 'INCIDENT REOPENED',
        update: 'INCIDENT UPDATE',
        recovery: 'RECOVERY',
        test: 'TEST',
    };
    const link = input.incidentId
        ? `${publicAppUrl()}/admin/monitoring?incident=${encodeURIComponent(input.incidentId)}`
        : `${publicAppUrl()}/admin/monitoring`;

    return [
        `CalebDeck ${kindLabel[input.kind]}`,
        '',
        `Environment: ${envName()}`,
        `Severity: ${input.severity}`,
        `Service: ${input.service}`,
        '',
        input.title,
        input.summary,
        '',
        input.firstDetectedAt ? `First detected: ${input.firstDetectedAt}` : null,
        input.occurrenceCount != null ? `Occurrences: ${input.occurrenceCount}` : null,
        '',
        `Admin: ${link}`,
    ].filter((line) => line !== null).join('\n');
}

export async function sendTelegramAlert(input: {
    kind: TelegramAlertKind;
    severity: string;
    service: string;
    title: string;
    summary: string;
    firstDetectedAt?: string;
    occurrenceCount?: number;
    incidentId?: string;
    fingerprint?: string;
    force?: boolean;
}): Promise<{ delivered: boolean; skipped?: string; reason?: string }> {
    try {
        const creds = telegramCredentialsPresent();
        if (!creds.configured) {
            await recordAlertingStatus({
                lastDeliveryFailureAt: Date.now(),
                lastDeliveryFailureReason: 'Telegram bot token or chat ID is not configured',
            });
            return { delivered: false, skipped: 'not_configured' };
        }

        const cooldownKey = String(input.fingerprint || input.incidentId || input.kind);
        const ref = adminDb().collection(HEALTH_COLLECTION).doc(ALERTING_DOC_ID);
        const snap = await ref.get();
        const state = snap.data() || {};
        const lastByKey = (state.cooldowns && state.cooldowns[cooldownKey]) || {};
        const now = Date.now();
        const lastKindAt = Number(lastByKey[input.kind] || 0);
        const lastAnyAt = Number(lastByKey.at || 0);
        const lastFailureAt = Number(state.lastDeliveryFailureAt || 0);
        const lastDelivered = state.lastAlertDelivered === true;

        if (!input.force && input.kind === 'recovery' && Number(lastByKey.recovery || 0) >= Number(lastByKey.open || lastByKey.reopen || 0) && lastByKey.recovery) {
            return { delivered: false, skipped: 'already_recovered' };
        }

        if (!input.force && input.kind !== 'test') {
            const windowMs = lastDelivered ? TELEGRAM_COOLDOWN_MS : TELEGRAM_FAILURE_RETRY_MS;
            const lastRelevant = input.kind === 'recovery' ? lastKindAt : lastAnyAt;
            if (lastRelevant && now - lastRelevant < windowMs) {
                return { delivered: false, skipped: 'cooldown' };
            }
            if (!lastDelivered && lastFailureAt && now - lastFailureAt < TELEGRAM_FAILURE_RETRY_MS) {
                return { delivered: false, skipped: 'retry_wait' };
            }
        }

        const text = formatIncidentAlert({
            ...input,
            firstDetectedAt: input.firstDetectedAt || formatWat(now),
        });
        const result = await postTelegram(text);
        const cooldownPatch = {
            ...(state.cooldowns || {}),
            [cooldownKey]: {
                ...lastByKey,
                [input.kind]: now,
                at: now,
                lastKind: input.kind,
                incidentId: input.incidentId || null,
            },
        };

        if (result.ok) {
            await recordAlertingStatus({
                lastAlertAt: now,
                lastAlertKind: input.kind,
                lastAlertIncidentId: input.incidentId || null,
                lastAlertDelivered: true,
                lastTelegramDeliveryAt: now,
                lastDeliveryFailureAt: null,
                lastDeliveryFailureReason: null,
                cooldowns: cooldownPatch,
            });
            return { delivered: true };
        }

        await recordAlertingStatus({
            lastAlertAt: now,
            lastAlertKind: input.kind,
            lastAlertIncidentId: input.incidentId || null,
            lastAlertDelivered: false,
            lastDeliveryFailureAt: now,
            lastDeliveryFailureReason: result.reason || 'telegram_send_failed',
        });
        return { delivered: false, reason: result.reason };
    } catch {
        console.warn('[telegram] send failed');
        return { delivered: false, reason: 'internal_error' };
    }
}

export async function sendTelegramTest() {
    const result = await sendTelegramAlert({
        kind: 'test',
        severity: 'info',
        service: 'backend',
        title: 'Telegram delivery test',
        summary: 'An administrator triggered this test from CalebDeck System Health. If you received it, external alerts are working.',
        force: true,
    });
    await recordAlertingStatus({
        lastTelegramTestAt: Date.now(),
        lastTelegramTestOk: result.delivered,
        lastTelegramTestError: result.delivered ? null : (result.skipped || result.reason || 'failed'),
    });
    return result;
}
