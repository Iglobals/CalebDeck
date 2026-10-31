import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { AdminAnnouncementsCard } from './AdminAnnouncementsCard';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import {
  AlertingStatus,
  fetchMonitoringStatus,
  fetchSystemLogs,
  formatWat,
  MonitoringStatusResponse,
  recordAdminTestEvent,
  runAdminHealthCheck,
  sendTelegramTestMessage,
  statusLabel,
  subscribeToAlertingStatus,
  subscribeToIncidents,
  subscribeToLogGroups,
  subscribeToSystemHealth,
  SystemHealth,
  SystemIncident,
  SystemLog,
  LogGroup,
  updateIncident,
  IncidentStatus,
} from '../../../services/monitoring';
import { toast } from 'react-toastify';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  Database,
  Search,
  Server,
  ShoppingBag,
  X,
} from 'lucide-react';

const SERVICE_LABELS: Record<string, string> = {
  payment: 'Payment',
  checkout: 'Checkout',
  order: 'Order creation',
  backend: 'Backend / API',
  firebase: 'Firebase / Database',
  webhook: 'Payment webhooks',
  frontend: 'Customer app',
  api: 'Backend / API',
};

function severityVariant(severity: string): 'red' | 'amber' | 'gray' | 'blue' | 'green' {
  if (severity === 'critical') return 'red';
  if (severity === 'high') return 'amber';
  if (severity === 'medium') return 'amber';
  if (severity === 'info') return 'blue';
  return 'gray';
}

function healthVariant(status?: string): 'green' | 'amber' | 'red' | 'gray' {
  if (status === 'operational') return 'green';
  if (status === 'degraded') return 'amber';
  if (status === 'experiencing_issues') return 'red';
  return 'gray';
}

function HealthCard({
  title,
  icon,
  service,
}: {
  title: string;
  icon: React.ReactNode;
  service?: {
    status?: string;
    basis?: string;
    lastSuccessAt?: number | null;
    lastFailureAt?: number | null;
    recentSuccesses?: number;
    recentFailures?: number;
    note?: string;
  };
}) {
  const { adminTheme } = useTheme();
  const isDark = adminTheme === 'dark';
  const status = service?.status || 'unknown';
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-100'}`}>{icon}</div>
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</p>
            <p className={`text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
              {service?.basis === 'measured' ? 'Measured from live events' : 'Unknown / not enough measured data'}
            </p>
          </div>
        </div>
        <Badge variant={healthVariant(status)}>{statusLabel(status)}</Badge>
      </div>
      <p className={`mt-4 text-sm ${isDark ? 'text-[#C4B8A8]' : 'text-gray-600'}`}>{service?.note || 'Waiting for measured events.'}</p>
      <div className={`mt-4 grid grid-cols-2 gap-3 text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
        <div>Recent successes: {service?.recentSuccesses ?? 0}</div>
        <div>Recent failures: {service?.recentFailures ?? 0}</div>
        <div>Last success: {service?.lastSuccessAt ? formatWat(service.lastSuccessAt) : 'None recorded'}</div>
        <div>Last failure: {service?.lastFailureAt ? formatWat(service.lastFailureAt) : 'None recorded'}</div>
      </div>
    </Card>
  );
}

export default function AdminMonitoring() {
  const { adminTheme } = useTheme();
  const { user } = useAuth();
  const isDark = adminTheme === 'dark';
  const [params] = useSearchParams();
  const [tab, setTab] = useState<'overview' | 'incidents' | 'logs'>('overview');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [groups, setGroups] = useState<LogGroup[]>([]);
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [incidentFilter, setIncidentFilter] = useState<IncidentStatus | 'all' | 'unresolved'>('unresolved');
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logCursor, setLogCursor] = useState<any>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<SystemIncident | null>(null);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [service, setService] = useState('');
  const [eventType, setEventType] = useState('');
  const [notes, setNotes] = useState('');
  const [testing, setTesting] = useState(false);
  const [alerting, setAlerting] = useState<AlertingStatus | null>(null);
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatusResponse | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [runningHealth, setRunningHealth] = useState(false);

  useEffect(() => {
    const unsubHealth = subscribeToSystemHealth(setHealth);
    const unsubGroups = subscribeToLogGroups(setGroups);
    const unsubAlerting = subscribeToAlertingStatus(setAlerting);
    return () => {
      unsubHealth();
      unsubGroups();
      unsubAlerting();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const token = await user?.getIdToken();
        if (!token) return;
        const status = await fetchMonitoringStatus(token);
        if (!cancelled) setMonitoringStatus(status);
      } catch {
        if (!cancelled) setMonitoringStatus(null);
      }
    };
    loadStatus();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const unsub = subscribeToIncidents(incidentFilter, setIncidents);
    return () => unsub();
  }, [incidentFilter]);

  useEffect(() => {
    const incidentId = params.get('incident');
    if (incidentId) {
      setTab('incidents');
      const match = incidents.find((item) => item.id === incidentId);
      if (match) setSelectedIncident(match);
    }
  }, [params, incidents]);

  const loadLogs = async (reset = true) => {
    setLogLoading(true);
    try {
      const result = await fetchSystemLogs({
        severity: severity || undefined,
        service: service || undefined,
        eventType: eventType || undefined,
        orderId: search.startsWith('CD-') ? search.trim() : undefined,
        paymentReference: /^\d{10,}$/.test(search.trim()) ? search.trim() : undefined,
        cursor: reset ? null : logCursor,
      });
      const filtered = search && !search.startsWith('CD-') && !/^\d{10,}$/.test(search.trim())
        ? result.logs.filter((log) =>
            `${log.humanTitle} ${log.humanSummary} ${log.errorMessage} ${log.orderId} ${log.paymentReference}`.toLowerCase().includes(search.toLowerCase())
          )
        : result.logs;
      setLogs((prev) => reset ? filtered : [...prev, ...filtered]);
      setLogCursor(result.cursor);
    } catch (error: any) {
      toast.error(error.message || 'Could not load logs. Confirm Firestore indexes are deployed.');
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'logs') loadLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, severity, service, eventType]);

  const unresolvedCount = useMemo(
    () => incidents.filter((item) => item.status !== 'resolved').length,
    [incidents]
  );

  const handleIncidentUpdate = async (status: IncidentStatus) => {
    if (!selectedIncident) return;
    try {
      await updateIncident(selectedIncident.id, {
        status,
        resolutionNotes: notes,
        acknowledgedBy: user?.uid,
      });
      toast.success(status === 'resolved' ? 'Incident marked resolved.' : 'Incident updated.');
    } catch (error: any) {
      toast.error(error.message || 'Could not update this incident.');
    }
  };

  const handleTelegramTest = async () => {
    setTestingTelegram(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Admin session expired');
      const result = await sendTelegramTestMessage(token);
      if (result.delivered) {
        toast.success('Telegram test delivered. Check the private alert group.');
      } else if (!result.configured) {
        toast.error('Telegram is not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_ALERT_CHAT_ID on Vercel.');
      } else {
        toast.error(result.reason || 'Telegram did not confirm delivery. The in-app alert still does not prove Telegram worked.');
      }
      const status = await fetchMonitoringStatus(token);
      setMonitoringStatus(status);
    } catch (error: any) {
      toast.error(error.message || 'Could not send the Telegram test.');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleHealthCheck = async () => {
    setRunningHealth(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Admin session expired');
      const result = await runAdminHealthCheck(token);
      if (result.ok) {
        toast.success('Health check passed. No customer charge was made.');
      } else {
        toast.error('Health check found a problem. Open the checks below for details.');
      }
      const status = await fetchMonitoringStatus(token);
      setMonitoringStatus(status);
    } catch (error: any) {
      toast.error(error.message || 'Could not run the health check.');
    } finally {
      setRunningHealth(false);
    }
  };

  const handleTestEvent = async () => {
    setTesting(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Admin session expired');
      await recordAdminTestEvent(token);
      toast.success('Test event recorded. Repeat 3 times to open a test incident.');
      setTab('logs');
    } catch (error: any) {
      toast.error(error.message || 'Could not record the test event.');
    } finally {
      setTesting(false);
    }
  };

  const inputClass = `rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? 'border-[#333] bg-[#2A2A2A] text-white' : 'border-gray-200 bg-white text-gray-900'}`;

  return (
    <AdminLayout title="System Health">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-[#7C3AED]" />
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>System Health</h1>
            </div>
            <p className={`mt-1 text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
              Live payment, checkout and application monitoring. Statuses below are measured from real events, not from a simple uptime ping.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['overview', 'incidents', 'logs'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${tab === item ? 'bg-[#7C3AED] text-white' : isDark ? 'bg-[#2A2A2A] text-[#E8E0D4]' : 'bg-gray-100 text-gray-700'}`}
              >
                {item}{item === 'incidents' && unresolvedCount > 0 ? ` (${unresolvedCount})` : ''}
              </button>
            ))}
          </div>
        </div>

        {tab === 'overview' && (
          <>
            <Card className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Overall system status</p>
                  <div className="mt-2 flex items-center gap-3">
                    <Badge variant={healthVariant(health?.overall)}>{statusLabel(health?.overall)}</Badge>
                    <span className={`text-sm ${isDark ? 'text-[#C4B8A8]' : 'text-gray-600'}`}>
                      {health?.overallBasis === 'measured' ? 'Measured from production events' : 'Unknown until live events are recorded'}
                    </span>
                  </div>
                </div>
                <div className={`grid grid-cols-2 gap-4 text-sm md:grid-cols-4 ${isDark ? 'text-[#C4B8A8]' : 'text-gray-600'}`}>
                  <div>
                    <p className="text-xs uppercase tracking-wide">Failed inits</p>
                    <p className="text-xl font-bold">{health?.failedInitCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide">Failed verifications</p>
                    <p className="text-xl font-bold">{health?.failedVerifyCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide">Critical errors</p>
                    <p className="text-xl font-bold">{health?.criticalErrorCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide">Last successful payment</p>
                    <p className="text-sm font-bold">{health?.lastSuccessfulPaymentAt ? formatWat(health.lastSuccessfulPaymentAt) : 'None recorded'}</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <HealthCard title="Payment service" icon={<CreditCard className="h-5 w-5 text-[#7C3AED]" />} service={health?.services?.payment} />
              <HealthCard title="Order creation" icon={<ShoppingBag className="h-5 w-5 text-[#7C3AED]" />} service={health?.services?.order} />
              <HealthCard title="Checkout" icon={<CheckCircle2 className="h-5 w-5 text-[#7C3AED]" />} service={health?.services?.checkout} />
              <HealthCard title="Backend / API" icon={<Server className="h-5 w-5 text-[#7C3AED]" />} service={health?.services?.backend} />
              <HealthCard title="Firebase / Database" icon={<Database className="h-5 w-5 text-[#7C3AED]" />} service={health?.services?.firebase} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="p-6">
                <h2 className={`mb-4 text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent incidents</h2>
                {incidents.length === 0 ? (
                  <p className={`text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>No incidents in this view. That is measured from grouped failures, not assumed uptime.</p>
                ) : (
                  <div className="space-y-3">
                    {incidents.slice(0, 6).map((incident) => (
                      <button
                        key={incident.id}
                        onClick={() => { setSelectedIncident(incident); setTab('incidents'); setNotes(incident.resolutionNotes || ''); }}
                        className={`w-full rounded-2xl border p-4 text-left ${isDark ? 'border-[#333] hover:bg-[#2A2A2A]' : 'border-gray-100 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{incident.title}</p>
                          <Badge variant={incident.status === 'resolved' ? 'green' : 'red'}>{incident.status}</Badge>
                        </div>
                        <p className={`mt-1 text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                          {SERVICE_LABELS[incident.service] || incident.service} · {incident.affectedEvents || 0} events · Last {formatWat(incident.lastDetectedAt)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
              <Card className="p-6">
                <h2 className={`mb-4 text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Grouped errors</h2>
                {groups.length === 0 ? (
                  <p className={`text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>No grouped errors yet. Events appear here after checkout, payment or app failures are recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {groups.slice(0, 8).map((group) => (
                      <div key={group.id} className={`rounded-2xl border p-4 ${isDark ? 'border-[#333]' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{group.humanTitle}</p>
                          <Badge variant={severityVariant(group.severity)}>{group.severity}</Badge>
                        </div>
                        <p className={`mt-1 text-sm ${isDark ? 'text-[#C4B8A8]' : 'text-gray-600'}`}>{group.humanSummary}</p>
                        <p className={`mt-2 text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                          {group.occurrenceCount} occurrence{group.occurrenceCount === 1 ? '' : 's'} · Last {formatWat(group.lastOccurredAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card className="p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className={`rounded-xl p-3 ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-100'}`}>
                  <Bell className="h-5 w-5 text-[#7C3AED]" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Alerting and scheduled checks</h2>
                  <p className={`text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                    Credentials stay on the server. This screen shows configuration status and delivery results only.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-[#333]' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Telegram</p>
                    <Badge variant={monitoringStatus?.telegram.configured || alerting?.telegramConfigured ? 'green' : 'amber'}>
                      {monitoringStatus?.telegram.configured || alerting?.telegramConfigured ? 'Configured' : 'Awaiting credentials'}
                    </Badge>
                  </div>
                  <div className={`mt-3 space-y-1 text-sm ${isDark ? 'text-[#C4B8A8]' : 'text-gray-600'}`}>
                    <p>Bot token: {monitoringStatus?.telegram.tokenPresent || alerting?.telegramTokenPresent ? 'present' : 'missing'}</p>
                    <p>Alert chat ID: {monitoringStatus?.telegram.chatIdPresent || alerting?.telegramChatIdPresent ? 'present' : 'missing'}</p>
                    <p>Last test: {alerting?.lastTelegramTestAt || monitoringStatus?.telegram.lastTestAt ? formatWat(alerting?.lastTelegramTestAt || monitoringStatus?.telegram.lastTestAt) : 'Never'}</p>
                    <p>Last test result: {alerting?.lastTelegramTestOk === true || monitoringStatus?.telegram.lastTestSucceeded === true ? 'Delivered' : alerting?.lastTelegramTestOk === false || monitoringStatus?.telegram.lastTestSucceeded === false ? (alerting?.lastTelegramTestError || monitoringStatus?.telegram.lastTestError || 'Failed') : 'Not tested'}</p>
                    <p>Last alert: {alerting?.lastAlertAt || monitoringStatus?.telegram.lastAlertAt ? formatWat(alerting?.lastAlertAt || monitoringStatus?.telegram.lastAlertAt) : 'None recorded'}</p>
                    <p>Last delivery: {alerting?.lastAlertDelivered === true || monitoringStatus?.telegram.lastAlertDelivered === true ? 'Confirmed by Telegram' : alerting?.lastAlertDelivered === false || monitoringStatus?.telegram.lastAlertDelivered === false ? 'Failed' : 'Unknown'}</p>
                    {(alerting?.lastDeliveryFailureReason || monitoringStatus?.telegram.lastDeliveryFailureReason) && (
                      <p>Delivery failure: {alerting?.lastDeliveryFailureReason || monitoringStatus?.telegram.lastDeliveryFailureReason}</p>
                    )}
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-[#333]' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Scheduled health checks</p>
                    <Badge variant={alerting?.lastHealthCheckOk || monitoringStatus?.healthCheck.lastOk ? 'green' : alerting?.lastHealthCheckAt || monitoringStatus?.healthCheck.lastRunAt ? 'amber' : 'gray'}>
                      {alerting?.lastHealthCheckOk || monitoringStatus?.healthCheck.lastOk ? 'Last run passed' : alerting?.lastHealthCheckAt || monitoringStatus?.healthCheck.lastRunAt ? 'Last run found issues' : 'Not run yet'}
                    </Badge>
                  </div>
                  <div className={`mt-3 space-y-1 text-sm ${isDark ? 'text-[#C4B8A8]' : 'text-gray-600'}`}>
                    <p>Vercel Cron: daily at 07:00 UTC (Hobby limit: once per day)</p>
                    <p>Cron secret: {monitoringStatus?.healthCheck.cronSecretConfigured || alerting?.cronSecretConfigured ? 'configured' : 'missing'}</p>
                    <p>Last run: {alerting?.lastHealthCheckAt || monitoringStatus?.healthCheck.lastRunAt ? `${formatWat(alerting?.lastHealthCheckAt || monitoringStatus?.healthCheck.lastRunAt)} (${alerting?.lastHealthCheckSource || monitoringStatus?.healthCheck.lastSource || 'unknown'})` : 'Never'}</p>
                    <p>Last success: {alerting?.lastSuccessfulHealthCheckAt || monitoringStatus?.healthCheck.lastSuccessAt ? formatWat(alerting?.lastSuccessfulHealthCheckAt || monitoringStatus?.healthCheck.lastSuccessAt) : 'None recorded'}</p>
                    <p>Summary: {alerting?.lastHealthCheckSummary || monitoringStatus?.healthCheck.lastSummary || 'Waiting for the first authenticated check.'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" disabled={testingTelegram} onClick={handleTelegramTest}>
                  {testingTelegram ? 'Sending…' : 'Send Telegram test'}
                </Button>
                <Button variant="outline" disabled={runningHealth} onClick={handleHealthCheck}>
                  {runningHealth ? 'Checking…' : 'Run health check now'}
                </Button>
              </div>
              <p className={`mt-3 text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                Writing an in-app notification is not proof that Telegram delivered. Use Send Telegram test and confirm the private group received it.
              </p>
            </Card>
            <AdminAnnouncementsCard />
            <Card className="p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Controlled test</h2>
                  <p className={`text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                    Records a safe admin-only test event. Repeat it three times to open a test incident. This does not charge a customer.
                  </p>
                </div>
                <Button variant="outline" disabled={testing} onClick={handleTestEvent}>Record test event</Button>
              </div>
            </Card>
          </>
        )}

        {tab === 'incidents' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Incidents</h2>
                <select value={incidentFilter} onChange={(e) => setIncidentFilter(e.target.value as any)} className={inputClass}>
                  <option value="unresolved">Unresolved</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="space-y-3">
                {incidents.length === 0 && (
                  <p className={`text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>No incidents match this filter.</p>
                )}
                {incidents.map((incident) => (
                  <button
                    key={incident.id}
                    onClick={() => { setSelectedIncident(incident); setNotes(incident.resolutionNotes || ''); }}
                    className={`w-full rounded-2xl border p-4 text-left ${selectedIncident?.id === incident.id ? 'border-[#7C3AED]' : isDark ? 'border-[#333]' : 'border-gray-100'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{incident.title}</p>
                      <Badge variant={incident.status === 'resolved' ? 'green' : 'red'}>{incident.status}</Badge>
                    </div>
                    <p className={`mt-1 text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                      {SERVICE_LABELS[incident.service] || incident.service} · First {formatWat(incident.firstDetectedAt)} · Last {formatWat(incident.lastDetectedAt)}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              {selectedIncident ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedIncident.title}</h3>
                      <p className={`mt-1 text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                        {SERVICE_LABELS[selectedIncident.service] || selectedIncident.service}
                      </p>
                    </div>
                    <Badge variant={severityVariant(selectedIncident.severity)}>{selectedIncident.severity}</Badge>
                  </div>
                  <div className={`grid grid-cols-2 gap-3 text-sm ${isDark ? 'text-[#C4B8A8]' : 'text-gray-600'}`}>
                    <div>Status: {selectedIncident.status}</div>
                    <div>Affected events: {selectedIncident.affectedEvents || 0}</div>
                    <div>First detected: {formatWat(selectedIncident.firstDetectedAt)}</div>
                    <div>Last detected: {formatWat(selectedIncident.lastDetectedAt)}</div>
                  </div>
                  {selectedIncident.relatedLogPreview && (
                    <div className={`rounded-xl p-3 text-sm ${isDark ? 'bg-[#2A2A2A] text-[#C4B8A8]' : 'bg-gray-50 text-gray-600'}`}>
                      {String(selectedIncident.relatedLogPreview.humanTitle || '')}
                    </div>
                  )}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    placeholder="Resolution notes"
                    className={`w-full ${inputClass}`}
                  />
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={() => handleIncidentUpdate('investigating')}>Mark investigating</Button>
                    <Button variant="primary" onClick={() => handleIncidentUpdate('resolved')}>Mark resolved</Button>
                    <p className={`text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                      Incidents stay open until an admin resolves them. Quiet periods do not auto-close an incident.
                    </p>
                  </div>
                </div>
              ) : (
                <p className={`text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Select an incident to view details, related events and resolution notes.</p>
              )}
            </Card>
          </div>
        )}

        {tab === 'logs' && (
          <Card className="p-6">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadLogs(true); }}
                  placeholder="Search message, order ID or payment reference"
                  className={`w-full pl-10 ${inputClass}`}
                />
              </div>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputClass}>
                <option value="">All severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
              <select value={service} onChange={(e) => setService(e.target.value)} className={inputClass}>
                <option value="">All services</option>
                {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="mb-4 flex flex-col gap-3 md:flex-row">
              <input
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="Event type, e.g. pre_save_failed"
                className={`flex-1 ${inputClass}`}
              />
              <Button variant="outline" onClick={() => loadLogs(true)}>Apply filters</Button>
            </div>
            <div className="space-y-3">
              {logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`w-full rounded-2xl border p-4 text-left ${isDark ? 'border-[#333] hover:bg-[#2A2A2A]' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{log.humanTitle}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={severityVariant(log.severity)}>{log.severity}</Badge>
                      <span className={`text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{formatWat(log.createdAt || log.timestampMs)}</span>
                    </div>
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? 'text-[#C4B8A8]' : 'text-gray-600'}`}>{log.humanSummary}</p>
                  <p className={`mt-2 text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                    {SERVICE_LABELS[log.service] || log.service} · {log.eventType} · {log.occurrenceCount || 1} occurrence{(log.occurrenceCount || 1) === 1 ? '' : 's'}
                    {log.orderId ? ` · Order ${log.orderId}` : ''}
                    {log.paymentReference ? ` · Ref ${log.paymentReference}` : ''}
                  </p>
                </button>
              ))}
              {logs.length === 0 && !logLoading && (
                <p className={`text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>No logs match these filters yet.</p>
              )}
              {logCursor && (
                <Button variant="outline" className="w-full" disabled={logLoading} onClick={() => loadLogs(false)}>
                  {logLoading ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center" onClick={() => setSelectedLog(null)}>
          <div
            className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-6 ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-white text-gray-900'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="text-xl font-bold">{selectedLog.humanTitle}</h3>
                </div>
                <p className={`mt-1 text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{selectedLog.humanSummary}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="rounded-full p-2 hover:bg-black/10" aria-label="Close log details">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-black uppercase tracking-wide">What this means</h4>
                <p className={`text-sm ${isDark ? 'text-[#C4B8A8]' : 'text-gray-600'}`}>{selectedLog.humanSummary}</p>
                <p className={`text-sm ${isDark ? 'text-[#C4B8A8]' : 'text-gray-600'}`}>Suggested next action: {selectedLog.suggestedAction || 'Review the developer details and related incident.'}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={severityVariant(selectedLog.severity)}>{selectedLog.severity}</Badge>
                  <Badge variant="gray">{SERVICE_LABELS[selectedLog.service] || selectedLog.service}</Badge>
                  <Badge variant="blue">{selectedLog.eventType}</Badge>
                </div>
              </div>
              <div className={`space-y-2 rounded-2xl p-4 text-sm ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-50'}`}>
                <h4 className="text-sm font-black uppercase tracking-wide">Developer details</h4>
                <p>Time: {formatWat(selectedLog.createdAt || selectedLog.timestampMs)}</p>
                <p>Environment: {selectedLog.environment || 'unknown'}</p>
                <p>HTTP: {selectedLog.httpStatus || 'n/a'}</p>
                <p>Endpoint: {selectedLog.endpoint || 'n/a'}</p>
                <p>Component: {selectedLog.component || 'n/a'}</p>
                <p>Error code: {selectedLog.errorCode || 'n/a'}</p>
                <p>Order ID: {selectedLog.orderId || 'n/a'}</p>
                <p>Payment reference: {selectedLog.paymentReference || 'n/a'}</p>
                <p>Correlation ID: {selectedLog.correlationId || 'n/a'}</p>
                <p>Fingerprint: {selectedLog.fingerprint || 'n/a'}</p>
              </div>
            </div>
            {selectedLog.errorMessage && (
              <pre className={`mt-4 overflow-x-auto rounded-2xl p-4 text-xs ${isDark ? 'bg-black text-emerald-300' : 'bg-gray-900 text-emerald-200'}`}>{selectedLog.errorMessage}</pre>
            )}
            {selectedLog.stack && (
              <pre className={`mt-3 overflow-x-auto rounded-2xl p-4 text-xs ${isDark ? 'bg-black text-gray-300' : 'bg-gray-900 text-gray-100'}`}>{selectedLog.stack}</pre>
            )}
            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
              <pre className={`mt-3 overflow-x-auto rounded-2xl p-4 text-xs ${isDark ? 'bg-black text-gray-300' : 'bg-gray-900 text-gray-100'}`}>{JSON.stringify(selectedLog.details, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
