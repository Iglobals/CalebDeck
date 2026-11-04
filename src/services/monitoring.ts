import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

export const SYSTEM_LOGS = 'system_logs';
export const SYSTEM_LOG_GROUPS = 'system_log_groups';
export const SYSTEM_INCIDENTS = 'system_incidents';
export const SYSTEM_HEALTH = 'system_health';

export type HealthStatus = 'operational' | 'degraded' | 'experiencing_issues' | 'unknown';
export type IncidentStatus = 'open' | 'investigating' | 'resolved';
export type FailureCategory = 'client_network' | 'application' | 'provider' | 'unknown';

export interface ServiceHealthData {
  status: HealthStatus;
  basis: 'measured' | 'inferred' | 'unknown';
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  recentSuccesses: number;
  recentFailures: number;
  activeWindowSuccesses?: number;
  activeWindowFailures?: number;
  totalSuccesses?: number;
  totalFailures?: number;
  byCategory?: {
    client_network: number;
    application: number;
    provider: number;
    unknown: number;
  };
  note?: string;
}

export interface SystemHealth {
  overall: HealthStatus;
  overallBasis?: 'measured' | 'inferred' | 'unknown';
  services?: Record<string, ServiceHealthData>;
  failedInitCount?: number;
  failedVerifyCount?: number;
  lastSuccessfulPaymentAt?: number | null;
  lastSuccessfulPreSaveAt?: number | null;
  recentErrorCount?: number;
  criticalErrorCount?: number;
  environment?: string;
  updatedAt?: any;
}

export interface AlertingStatus {
  telegramConfigured?: boolean;
  telegramTokenPresent?: boolean;
  telegramChatIdPresent?: boolean;
  lastTelegramTestAt?: number | null;
  lastTelegramTestOk?: boolean | null;
  lastTelegramTestError?: string | null;
  lastAlertAt?: number | null;
  lastAlertKind?: string | null;
  lastAlertIncidentId?: string | null;
  lastAlertDelivered?: boolean | null;
  lastTelegramDeliveryAt?: number | null;
  lastDeliveryFailureAt?: number | null;
  lastDeliveryFailureReason?: string | null;
  lastHealthCheckAt?: number | null;
  lastSuccessfulHealthCheckAt?: number | null;
  lastHealthCheckOk?: boolean | null;
  lastHealthCheckSource?: string | null;
  lastHealthCheckSummary?: string | null;
  cronSecretConfigured?: boolean;
  cronSchedule?: string;
  cronPlan?: string;
  environment?: string;
}

export interface MonitoringStatusResponse {
  environment?: string;
  telegram: {
    configured: boolean;
    tokenPresent: boolean;
    chatIdPresent: boolean;
    lastTestAt: number | null;
    lastTestSucceeded: boolean | null;
    lastTestError: string | null;
    lastAlertAt: number | null;
    lastAlertKind: string | null;
    lastAlertDelivered: boolean | null;
    lastDeliveryFailureAt: number | null;
    lastDeliveryFailureReason: string | null;
  };
  healthCheck: {
    cronSecretConfigured: boolean;
    schedule: string;
    plan: string;
    lastRunAt: number | null;
    lastSuccessAt: number | null;
    lastOk: boolean | null;
    lastSource: string | null;
    lastSummary: string | null;
  };
}

export interface SystemLog {
  id: string;
  eventId?: string;
  fingerprint?: string;
  createdAt?: any;
  timestampMs?: number;
  environment?: string;
  severity: string;
  category: string;
  failureCategory?: FailureCategory;
  service: string;
  eventType: string;
  humanTitle: string;
  humanSummary: string;
  suggestedAction?: string;
  errorMessage?: string;
  errorCode?: string;
  stack?: string;
  httpStatus?: number | null;
  endpoint?: string;
  component?: string;
  correlationId?: string;
  orderId?: string;
  paymentReference?: string;
  details?: Record<string, unknown>;
  occurrenceCount?: number;
}

export interface SystemIncident {
  id: string;
  title: string;
  severity: string;
  service: string;
  fingerprint?: string;
  eventType?: string;
  firstDetectedAt?: any;
  lastDetectedAt?: any;
  affectedEvents?: number;
  status: IncidentStatus;
  resolutionNotes?: string;
  relatedLogPreview?: Record<string, unknown>;
}

export interface LogGroup {
  id: string;
  fingerprint: string;
  severity: string;
  service: string;
  eventType: string;
  failureCategory?: FailureCategory;
  humanTitle: string;
  humanSummary: string;
  suggestedAction?: string;
  occurrenceCount: number;
  lastOccurredAt?: any;
  lastErrorMessage?: string;
  lastErrorCode?: string;
  lastOrderId?: string;
  lastPaymentReference?: string;
  ongoing?: boolean;
}

export function formatWat(value: any): string {
  const date = value?.toDate?.()
    ? value.toDate()
    : value?.seconds
      ? new Date(value.seconds * 1000)
      : typeof value === 'number'
        ? new Date(value)
        : value
          ? new Date(value)
          : null;
  if (!date || Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusLabel(status?: string) {
  if (status === 'operational') return 'Operational';
  if (status === 'degraded') return 'Degraded';
  if (status === 'experiencing_issues') return 'Experiencing issues';
  return 'Unknown / Not monitored';
}

function safeFetch(url: string, body: Record<string, unknown>) {
  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Monitoring must never break checkout.
  }
}

export function reportFrontendError(payload: {
  eventType?: string;
  humanTitle?: string;
  humanSummary?: string;
  suggestedAction?: string;
  errorMessage?: string;
  errorCode?: string;
  stack?: string;
  component?: string;
  endpoint?: string;
  correlationId?: string;
  orderId?: string;
  paymentReference?: string;
  path?: string;
}) {
  safeFetch('/api/utils/report-error', {
    eventType: payload.eventType || 'frontend_error',
    humanTitle: payload.humanTitle,
    humanSummary: payload.humanSummary,
    suggestedAction: payload.suggestedAction,
    errorMessage: payload.errorMessage,
    errorCode: payload.errorCode,
    stack: payload.stack,
    component: payload.component,
    endpoint: payload.endpoint,
    correlationId: payload.correlationId,
    orderId: payload.orderId,
    paymentReference: payload.paymentReference,
    path: payload.path || (typeof window !== 'undefined' ? window.location.pathname : ''),
  });
}

export async function recordAdminTestEvent(idToken: string) {
  const response = await fetch('/api/utils/record-event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      eventType: 'admin_test_event',
      severity: 'high',
      category: 'application',
      service: 'backend',
      humanTitle: 'Controlled monitoring test',
      humanSummary: 'An administrator triggered a safe test event to confirm logging and incident detection.',
      errorMessage: 'Controlled admin test event',
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not record the test event');
  }
}

export async function fetchMonitoringStatus(idToken: string): Promise<MonitoringStatusResponse> {
  const response = await fetch('/api/utils/monitoring-status', {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Could not load monitoring status');
  }
  return data as MonitoringStatusResponse;
}

export async function sendTelegramTestMessage(idToken: string) {
  const response = await fetch('/api/utils/telegram-test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 502) {
    throw new Error(data.error || data.reason || 'Could not send the Telegram test');
  }
  return data as { configured: boolean; delivered: boolean; reason?: string | null; skipped?: string | null; tokenPresent?: boolean; chatIdPresent?: boolean };
}

export async function runAdminHealthCheck(idToken: string) {
  const response = await fetch('/api/utils/health-check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({}),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 429) {
    throw new Error(data.error || 'Could not run the health check');
  }
  return data as {
    ok: boolean;
    source?: string;
    durationMs?: number;
    checks?: Record<string, { ok: boolean; latencyMs: number; note: string }>;
    chargedCustomer?: boolean;
    telegramConfigured?: boolean;
    cronSecretConfigured?: boolean;
  };
}

export const subscribeToSystemHealth = (callback: (health: SystemHealth | null) => void) => {
  return onSnapshot(
    doc(db, SYSTEM_HEALTH, 'current'),
    (snap) => callback(snap.exists() ? (snap.data() as SystemHealth) : null),
    () => callback(null)
  );
};

export const subscribeToAlertingStatus = (callback: (status: AlertingStatus | null) => void) => {
  return onSnapshot(
    doc(db, SYSTEM_HEALTH, 'alerting'),
    (snap) => callback(snap.exists() ? (snap.data() as AlertingStatus) : null),
    () => callback(null)
  );
};

export const subscribeToLogGroups = (callback: (groups: LogGroup[]) => void) => {
  const q = query(collection(db, SYSTEM_LOG_GROUPS), orderBy('lastOccurredAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LogGroup, 'id'>) })));
  }, () => callback([]));
};

export const subscribeToIncidents = (
  status: IncidentStatus | 'all' | 'unresolved',
  callback: (incidents: SystemIncident[]) => void
) => {
  const q = query(collection(db, SYSTEM_INCIDENTS), orderBy('lastDetectedAt', 'desc'), limit(80));
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SystemIncident, 'id'>) }));
    const filtered = status === 'all'
      ? all
      : status === 'unresolved'
        ? all.filter((item) => item.status === 'open' || item.status === 'investigating')
        : all.filter((item) => item.status === status);
    callback(filtered);
  }, () => callback([]));
};

export const subscribeToOpenIncidentCount = (callback: (count: number) => void) => {
  const q = query(collection(db, SYSTEM_INCIDENTS), orderBy('lastDetectedAt', 'desc'), limit(40));
  return onSnapshot(q, (snap) => {
    const count = snap.docs.filter((d) => {
      const status = d.data()?.status;
      return status === 'open' || status === 'investigating';
    }).length;
    callback(count);
  }, () => callback(0));
};

export async function fetchSystemLogs(options: {
  severity?: string;
  service?: string;
  eventType?: string;
  orderId?: string;
  paymentReference?: string;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
  pageSize?: number;
}) {
  const pageSize = options.pageSize || 25;
  const col = collection(db, SYSTEM_LOGS);
  const constraints: any[] = [];
  if (options.orderId) constraints.push(where('orderId', '==', options.orderId));
  else if (options.paymentReference) constraints.push(where('paymentReference', '==', options.paymentReference));
  else if (options.severity) constraints.push(where('severity', '==', options.severity));
  else if (options.service) constraints.push(where('service', '==', options.service));
  else if (options.eventType) constraints.push(where('eventType', '==', options.eventType));
  constraints.push(orderBy('createdAt', 'desc'));
  if (options.cursor) constraints.push(startAfter(options.cursor));
  constraints.push(limit(pageSize));
  const snap = await getDocs(query(col, ...constraints));
  return {
    logs: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SystemLog, 'id'>) })),
    cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
  };
}

export async function updateIncident(id: string, updates: {
  status?: IncidentStatus;
  resolutionNotes?: string;
  acknowledgedBy?: string;
}) {
  const payload: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (updates.status) payload.status = updates.status;
  if (typeof updates.resolutionNotes === 'string') payload.resolutionNotes = updates.resolutionNotes;
  if (updates.status === 'investigating') payload.acknowledgedAt = new Date();
  if (updates.status === 'resolved') payload.resolvedAt = new Date();
  if (updates.acknowledgedBy) payload.acknowledgedBy = updates.acknowledgedBy;
  await updateDoc(doc(db, SYSTEM_INCIDENTS, id), payload);
}

export async function sendTestPushToCurrentDevice(idToken: string, fcmToken: string) {
  const response = await fetch('/api/utils?action=test-push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ token: fcmToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send test push notification.');
  }
  return data;
}
