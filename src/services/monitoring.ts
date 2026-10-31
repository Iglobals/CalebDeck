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

export interface SystemHealth {
  overall: HealthStatus;
  overallBasis?: 'measured' | 'inferred' | 'unknown';
  services?: Record<string, {
    status: HealthStatus;
    basis: 'measured' | 'inferred' | 'unknown';
    lastSuccessAt: number | null;
    lastFailureAt: number | null;
    recentSuccesses: number;
    recentFailures: number;
    note?: string;
  }>;
  failedInitCount?: number;
  failedVerifyCount?: number;
  lastSuccessfulPaymentAt?: number | null;
  lastSuccessfulPreSaveAt?: number | null;
  recentErrorCount?: number;
  criticalErrorCount?: number;
  environment?: string;
  updatedAt?: any;
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

export const subscribeToSystemHealth = (callback: (health: SystemHealth | null) => void) => {
  return onSnapshot(
    doc(db, SYSTEM_HEALTH, 'current'),
    (snap) => callback(snap.exists() ? (snap.data() as SystemHealth) : null),
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
