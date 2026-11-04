import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';
import { getMessaging } from 'firebase-admin/messaging';
import { adminDb, ensureFirebaseAdmin } from '../../server/firebase-admin.js';
import { isRateLimited, clientIp } from '../../server/rate-limit.js';
import { recordEvent } from '../../server/monitoring.js';
import { verifyAdmin } from '../../server/verify-admin.js';
import { runScheduledHealthCheck } from '../../server/health-check.js';
import {
    cronSecretConfigured,
    sendTelegramTest,
    telegramCredentialsPresent,
    ALERTING_DOC_ID,
    HEALTH_COLLECTION,
} from '../../server/telegram.js';
import { loadTrackedOrder } from '../../server/order-tracking.js';

// --- CLOUDINARY HANDLERS ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function handleCloudinary(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { paramsToSign } = req.body || {};
    
    if (!paramsToSign) {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, upload_preset: 'calebdeck' },
        process.env.CLOUDINARY_API_SECRET || ''
      );
      
      return res.status(200).json({ 
        timestamp, 
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY 
      });
    }

    try {
      const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET || ''
      );
      return res.status(200).json({ 
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY 
      });
    } catch (error) {
      console.error('Signing error:', error);
      return res.status(500).json({ error: 'Failed to sign request' });
    }
  }

  if (req.method === 'DELETE') {
    const { public_id, resource_type = 'image' } = req.query;
    
    if (!public_id || typeof public_id !== 'string') {
      return res.status(400).json({ error: 'Missing public_id' });
    }

    try {
      const result = await cloudinary.uploader.destroy(public_id, { resource_type: resource_type as string });
      return res.status(200).json(result);
    } catch (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete media' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// --- SEND PUSH HANDLERS ---
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

async function isPushAuthorized(req: VercelRequest): Promise<boolean> {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (expectedKey && apiKey === expectedKey) return true;

    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        try {
            ensureFirebaseAdmin();
            const { getAuth } = await import('firebase-admin/auth');
            await getAuth().verifyIdToken(authHeader.slice('Bearer '.length));
            return true;
        } catch {
            return false;
        }
    }
    return false;
}

async function handleSendPush(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (isRateLimited(`send-push:${clientIp(req)}`, 10, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    if (!(await isPushAuthorized(req))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        ensureFirebaseAdmin();
        const { tokens, title, body, link, userId, targetCollection = 'users' } = req.body;

        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return res.status(400).json({ error: 'Missing or invalid tokens array' });
        }
        if (!title || !body) {
            return res.status(400).json({ error: 'Missing title or body' });
        }

        const message: any = {
            notification: { title, body },
            data: { 
                link: link || '/',
                title: String(title),
                body: String(body),
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                },
                notification: {
                    title,
                    body,
                    icon: '/calebdeck-logo.jpeg',
                    badge: '/calebdeck-logo.jpeg',
                    requireInteraction: false,
                },
                fcmOptions: {
                    link: link || '/',
                },
            },
            apns: {
                headers: {
                    'apns-priority': '10',
                },
                payload: {
                    aps: {
                        alert: {
                            title,
                            body,
                        },
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
            tokens: tokens,
        };

        const response = await getMessaging().sendEachForMulticast(message);

        // Detect and collect expired/invalid registration tokens
        const badTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error) {
                const code = resp.error.code;
                if (
                    code === 'messaging/registration-token-not-registered' ||
                    code === 'messaging/invalid-registration-token' ||
                    code === 'messaging/invalid-argument'
                ) {
                    badTokens.push(tokens[idx]);
                }
            }
        });

        // Automatically prune stale tokens from Firestore
        if (badTokens.length > 0 && userId) {
            try {
                const { FieldValue } = await import('firebase-admin/firestore');
                await adminDb().collection(targetCollection).doc(userId).update({
                    fcmTokens: FieldValue.arrayRemove(...badTokens)
                });
                console.log(`Pruned ${badTokens.length} expired FCM token(s) for ${targetCollection}/${userId}`);
            } catch (pruneErr) {
                console.warn('Could not prune stale tokens:', pruneErr);
            }
        }

        // Record health event for push notification
        await recordEvent({
            severity: response.failureCount > 0 && response.successCount === 0 ? 'medium' : 'info',
            category: 'application',
            service: 'backend',
            eventType: response.failureCount > 0 && response.successCount === 0 ? 'push_notification_failed' : 'push_notification_sent',
            humanTitle: response.successCount > 0 ? 'Push notification delivered' : 'Push notification delivery failed',
            humanSummary: `Push sent to ${tokens.length} device(s): ${response.successCount} succeeded, ${response.failureCount} failed.`,
            suggestedAction: response.failureCount > 0 ? 'Some tokens have expired or devices were unreachable. Expired tokens are pruned automatically.' : undefined,
            details: {
                successCount: response.successCount,
                failureCount: response.failureCount,
                badTokensCount: badTokens.length
            }
        }).catch(() => {});

        return res.status(200).json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            prunedTokensCount: badTokens.length,
        });
    } catch (error: any) {
        console.error('Error sending push notification:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

const FRONTEND_EVENT_TYPES = new Set([
    'frontend_error',
    'unhandled_rejection',
    'checkout_failed',
    'payment_init_failed',
    'paystack_init_failed',
    'missing_hostel',
    'invalid_checkout_payload',
]);

async function handleReportError(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (isRateLimited(`report-error:${clientIp(req)}`, 12, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const body = req.body || {};
    const eventType = FRONTEND_EVENT_TYPES.has(String(body.eventType)) ? String(body.eventType) : 'frontend_error';
    const severity = eventType === 'payment_init_failed' || eventType === 'paystack_init_failed' || eventType === 'checkout_failed'
        ? 'high'
        : eventType === 'missing_hostel' || eventType === 'invalid_checkout_payload'
            ? 'medium'
            : 'medium';

    await recordEvent({
        severity,
        category: eventType.includes('payment') || eventType.includes('paystack') ? 'payment' : eventType.includes('checkout') || eventType.includes('hostel') ? 'order' : 'application',
        service: 'frontend',
        eventType,
        humanTitle: String(body.humanTitle || 'A customer-facing error occurred').slice(0, 140),
        humanSummary: String(body.humanSummary || 'The app reported a problem from a student device.').slice(0, 400),
        suggestedAction: String(body.suggestedAction || 'Open the log in System Health and inspect the component and stack trace.').slice(0, 400),
        errorMessage: String(body.errorMessage || '').slice(0, 1500),
        errorCode: body.errorCode ? String(body.errorCode).slice(0, 80) : undefined,
        stack: body.stack ? String(body.stack).slice(0, 4000) : undefined,
        endpoint: body.endpoint ? String(body.endpoint).slice(0, 200) : undefined,
        component: body.component ? String(body.component).slice(0, 120) : undefined,
        correlationId: body.correlationId ? String(body.correlationId).slice(0, 80) : undefined,
        orderId: body.orderId ? String(body.orderId).slice(0, 80) : undefined,
        paymentReference: body.paymentReference ? String(body.paymentReference).slice(0, 80) : undefined,
        details: {
            path: typeof body.path === 'string' ? body.path.slice(0, 200) : undefined,
            userAgent: typeof req.headers['user-agent'] === 'string' ? String(req.headers['user-agent']).slice(0, 180) : undefined,
        },
    });

    return res.status(202).json({ accepted: true });
}

async function handleAdminRecordEvent(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    ensureFirebaseAdmin();
    const admin = await verifyAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    if (isRateLimited(`record-event:${admin.uid}`, 10, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const body = req.body || {};
    await recordEvent({
        severity: body.severity === 'critical' ? 'high' : (body.severity || 'medium'),
        category: body.category || 'application',
        service: body.service || 'backend',
        eventType: String(body.eventType || 'admin_test_event').slice(0, 80),
        humanTitle: String(body.humanTitle || 'Admin test event').slice(0, 140),
        humanSummary: String(body.humanSummary || 'An administrator recorded a controlled test event.').slice(0, 400),
        suggestedAction: 'This is a controlled test. Resolve the related incident after confirming logging works.',
        errorMessage: body.errorMessage ? String(body.errorMessage).slice(0, 500) : 'Controlled admin test event',
        errorCode: 'ADMIN_TEST',
        component: 'AdminMonitoring',
        details: { triggeredBy: admin.uid, test: true },
    });

    return res.status(200).json({ success: true });
}

function cronSecret() {
    return String(process.env.CRON_SECRET || process.env.MONITORING_CRON_SECRET || '').trim();
}

function isCronAuthorized(req: VercelRequest) {
    const expected = cronSecret();
    if (!expected) return false;
    const auth = String(req.headers.authorization || '');
    const header = String(req.headers['x-cron-secret'] || req.headers['x-monitoring-cron-secret'] || '');
    return auth === `Bearer ${expected}` || header === expected;
}

function healthCheckSource(req: VercelRequest, adminTriggered: boolean): 'cron' | 'github' | 'admin' {
    if (String(req.headers['x-health-check-source'] || '').toLowerCase() === 'github') return 'github';
    if (adminTriggered && !isCronAuthorized(req)) return 'admin';
    return 'cron';
}

async function handleHealthCheck(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let admin: { uid: string } | null = null;
    try {
        ensureFirebaseAdmin();
        admin = await verifyAdmin(req);
    } catch {
        admin = null;
    }

    if (!admin && !isCronAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (isRateLimited(`health-check:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const result = await runScheduledHealthCheck(healthCheckSource(req, Boolean(admin)));
    const creds = telegramCredentialsPresent();
    return res.status(result.ok ? 200 : 503).json({
        ...result,
        telegramConfigured: creds.configured,
        cronSecretConfigured: cronSecretConfigured(),
    });
}

async function handleTelegramTest(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    ensureFirebaseAdmin();
    const admin = await verifyAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    if (isRateLimited(`telegram-test:${admin.uid}`, 5, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const creds = telegramCredentialsPresent();
    if (!creds.configured) {
        return res.status(200).json({
            configured: false,
            delivered: false,
            reason: 'Telegram bot token or chat ID is not configured on the server.',
            tokenPresent: creds.tokenPresent,
            chatIdPresent: creds.chatIdPresent,
        });
    }

    const result = await sendTelegramTest();
    return res.status(result.delivered ? 200 : 502).json({
        configured: true,
        delivered: result.delivered,
        skipped: result.skipped || null,
        reason: result.reason || null,
    });
}

async function handleTrackOrder(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (isRateLimited(`track-order:${clientIp(req)}`, 20, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const orderId = String(req.body?.orderId || '').trim();
    const trackingToken = String(req.body?.trackingToken || '').trim();
    if (!orderId || !trackingToken || orderId.length > 80 || trackingToken.length > 80) {
        return res.status(400).json({ error: 'Missing tracking details' });
    }

    try {
        ensureFirebaseAdmin();
        const data = await loadTrackedOrder(orderId, trackingToken);
        if (!data) return res.status(404).json({ error: 'Order not found' });
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[track-order] failed:', error);
        return res.status(500).json({ error: 'Could not load tracking' });
    }
}

async function handleMonitoringStatus(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    ensureFirebaseAdmin();
    const admin = await verifyAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });

    const creds = telegramCredentialsPresent();
    let stored: Record<string, unknown> = {};
    try {
        const snap = await adminDb().collection(HEALTH_COLLECTION).doc(ALERTING_DOC_ID).get();
        stored = snap.data() || {};
    } catch {
        stored = {};
    }

    return res.status(200).json({
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
        telegram: {
            configured: creds.configured,
            tokenPresent: creds.tokenPresent,
            chatIdPresent: creds.chatIdPresent,
            lastTestAt: stored.lastTelegramTestAt || null,
            lastTestSucceeded: stored.lastTelegramTestOk ?? null,
            lastTestError: stored.lastTelegramTestError || null,
            lastAlertAt: stored.lastAlertAt || null,
            lastAlertKind: stored.lastAlertKind || null,
            lastAlertDelivered: stored.lastAlertDelivered ?? null,
            lastDeliveryFailureAt: stored.lastDeliveryFailureAt || null,
            lastDeliveryFailureReason: stored.lastDeliveryFailureReason || null,
        },
        healthCheck: {
            cronSecretConfigured: cronSecretConfigured(),
            schedule: '0 7 * * *',
            plan: 'Vercel Hobby allows one cron expression per day. More frequent checks need Pro or GitHub Actions.',
            lastRunAt: stored.lastHealthCheckAt || null,
            lastSuccessAt: stored.lastSuccessfulHealthCheckAt || null,
            lastOk: stored.lastHealthCheckOk ?? null,
            lastSource: stored.lastHealthCheckSource || null,
            lastSummary: stored.lastHealthCheckSummary || null,
        },
    });
}

async function handleTestPush(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    ensureFirebaseAdmin();
    const admin = await verifyAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });

    const { token } = req.body || {};
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Missing device FCM token' });
    }

    try {
        const message: any = {
            notification: {
                title: 'CalebDeck Push Diagnostics 🔔',
                body: 'Your device is successfully receiving push notifications from CalebDeck!',
            },
            data: {
                link: '/admin/monitoring',
                type: 'diagnostic_test',
            },
            webpush: {
                headers: { Urgency: 'high' },
                notification: {
                    title: 'CalebDeck Push Diagnostics 🔔',
                    body: 'Your device is successfully receiving push notifications from CalebDeck!',
                    icon: '/calebdeck-logo.jpeg',
                    badge: '/calebdeck-logo.jpeg',
                },
                fcmOptions: { link: '/admin/monitoring' }
            },
            apns: {
                headers: { 'apns-priority': '10' },
                payload: {
                    aps: {
                        alert: {
                            title: 'CalebDeck Push Diagnostics 🔔',
                            body: 'Your device is successfully receiving push notifications from CalebDeck!',
                        },
                        sound: 'default',
                        badge: 1,
                    }
                }
            },
            token: token.trim(),
        };

        const result = await getMessaging().send(message);
        return res.status(200).json({ success: true, messageId: result });
    } catch (error: any) {
        console.error('Error delivering test push:', error);
        return res.status(500).json({ error: error.message || 'Push delivery failed', code: error.code });
    }
}

// --- ROUTER ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Shared CORS configuration
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Api-Key, X-Cron-Secret, X-Monitoring-Cron-Secret, X-Health-Check-Source');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action;

    try {
        if (action === 'cloudinary') return await handleCloudinary(req, res);
        if (action === 'send-push') return await handleSendPush(req, res);
        if (action === 'test-push') return await handleTestPush(req, res);
        if (action === 'report-error') return await handleReportError(req, res);
        if (action === 'record-event') return await handleAdminRecordEvent(req, res);
        if (action === 'health-check') return await handleHealthCheck(req, res);
        if (action === 'telegram-test') return await handleTelegramTest(req, res);
        if (action === 'monitoring-status') return await handleMonitoringStatus(req, res);
        if (action === 'track-order') return await handleTrackOrder(req, res);

        return res.status(404).json({ error: 'Util route not found', action });
    } catch (err: any) {
        console.error(`[utils/${action}] Handler error:`, err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
