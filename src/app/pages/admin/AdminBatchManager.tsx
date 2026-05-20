import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Input } from '../../components/design-system/Input';
import {
  Clock, Plus, Trash2, Save, ToggleLeft, ToggleRight,
  AlertTriangle, ChevronDown, ChevronUp, Users, DollarSign,
  Zap, CheckCircle, Package, Truck, MapPin, RefreshCw, Shield
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  subscribeToBatchSchedules,
  updateBatchSchedules,
  subscribeTodayBatchDays,
  updateBatchDayStatus,
  subscribeToPlatformSettings,
  PlatformSettings,
} from '../../../services/db';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import type { FoodBatchSchedule, FoodBatchDay } from '../../../services/batchSchedule';
import {
  formatBatchTime,
  getDefaultSchedules,
  getBatchDayId,
  getBatchFillPercent,
} from '../../../services/batchSchedule';

const STATUS_FLOW: Record<string, { next: FoodBatchDay['status']; label: string; color: string }> = {
  OPEN: { next: 'CLOSED', label: 'Close Window', color: 'bg-amber-500' },
  CLOSED: { next: 'PREPARING', label: 'Mark Preparing', color: 'bg-blue-500' },
  FULL: { next: 'PREPARING', label: 'Mark Preparing', color: 'bg-blue-500' },
  PREPARING: { next: 'DISPATCHING', label: 'Start Dispatch', color: 'bg-purple-500' },
  DISPATCHING: { next: 'DELIVERING', label: 'Mark Delivering', color: 'bg-orange-500' },
  DELIVERING: { next: 'COMPLETED', label: 'Complete Batch', color: 'bg-emerald-500' },
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'green',
  CLOSED: 'gray',
  FULL: 'amber',
  PREPARING: 'blue',
  DISPATCHING: 'purple',
  DELIVERING: 'amber',
  COMPLETED: 'green',
};

export default function AdminBatchManager() {
  const [schedules, setSchedules] = useState<FoodBatchSchedule[]>([]);
  const [batchDays, setBatchDays] = useState<FoodBatchDay[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [editSchedules, setEditSchedules] = useState<FoodBatchSchedule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);

  // Firebase listeners
  useEffect(() => {
    const unsub1 = subscribeToBatchSchedules((s) => {
      setSchedules(s);
      setEditSchedules(JSON.parse(JSON.stringify(s)));
    });
    const unsub2 = subscribeTodayBatchDays(setBatchDays);
    const unsub3 = subscribeToPlatformSettings(setPlatformSettings);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const isEnabled = platformSettings?.orderWindowsEnabled === true;
  const isManualOverride = platformSettings?.orderWindowManualOverride === true;

  // ─── Toggle Order Windows System ───
  const toggleOrderWindows = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'platform');
      await updateDoc(settingsRef, {
        orderWindowsEnabled: !isEnabled,
        updatedAt: serverTimestamp(),
      });
      toast.success(isEnabled ? 'Order windows disabled — old hour-based system active' : 'Order windows enabled — batch system active');
    } catch (err) {
      toast.error('Failed to toggle order windows');
    }
  };

  // ─── Toggle Manual Override ───
  const toggleManualOverride = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'platform');
      await updateDoc(settingsRef, {
        orderWindowManualOverride: !isManualOverride,
        updatedAt: serverTimestamp(),
      });
      toast.success(isManualOverride ? 'Manual override disabled — schedule rules apply' : 'Manual override ON — ordering forced open');
    } catch (err) {
      toast.error('Failed to toggle override');
    }
  };

  // ─── Schedule Editing ───
  const updateScheduleField = (id: string, field: keyof FoodBatchSchedule, value: any) => {
    setEditSchedules(prev =>
      prev.map(s => s.id === id ? { ...s, [field]: value } : s)
    );
    setHasChanges(true);
  };

  const addNewBatch = () => {
    const newId = `batch_${Date.now()}`;
    setEditSchedules(prev => [...prev, {
      id: newId,
      batchName: 'New Batch',
      orderWindowStart: '12:00',
      orderWindowEnd: '14:00',
      deliveryWindowStart: '15:00',
      deliveryWindowEnd: '16:30',
      maxOrdersPerBatch: 50,
      isActive: true,
    }]);
    setExpandedSchedule(newId);
    setHasChanges(true);
  };

  const deleteBatch = (id: string) => {
    if (!confirm('Delete this batch schedule? This cannot be undone.')) return;
    setEditSchedules(prev => prev.filter(s => s.id !== id));
    setHasChanges(true);
  };

  const saveSchedules = async () => {
    setSaving(true);
    try {
      await updateBatchSchedules(editSchedules);
      setHasChanges(false);
      toast.success('Batch schedules saved');
    } catch (err) {
      toast.error('Failed to save schedules');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (!confirm('Reset to default 3 batches? Unsaved changes will be lost.')) return;
    setEditSchedules(getDefaultSchedules());
    setHasChanges(true);
  };

  // ─── Batch Day Status Transitions ───
  const transitionStatus = async (batchDay: FoodBatchDay) => {
    const flow = STATUS_FLOW[batchDay.status];
    if (!flow || !batchDay.id) return;
    try {
      await updateBatchDayStatus(batchDay.id, flow.next);
      toast.success(`${batchDay.batchName} → ${flow.next}`);
    } catch (err) {
      toast.error('Failed to update batch status');
    }
  };

  const todayStr = new Date().toLocaleDateString('en-CA');

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Delivery Batches</h1>
          <p className="text-muted-foreground font-medium mt-1">
            Configure order windows, monitor live capacity, and control batch lifecycle.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={isEnabled ? 'primary' : 'secondary'}
            onClick={toggleOrderWindows}
            className="flex items-center gap-2"
          >
            {isEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {isEnabled ? 'Windows Active' : 'Windows Off'}
          </Button>
        </div>
      </div>

      {/* Manual Override Banner */}
      {isEnabled && (
        <Card className={`border-2 ${isManualOverride ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'}`}>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-black">Manual Override</p>
                <p className="text-xs text-muted-foreground font-medium">
                  {isManualOverride
                    ? 'Ordering is forced OPEN — batch schedule ignored'
                    : 'Students can only order during active batch windows'}
                </p>
              </div>
            </div>
            <Button
              variant={isManualOverride ? 'primary' : 'secondary'}
              size="sm"
              onClick={toggleManualOverride}
            >
              {isManualOverride ? 'Disable Override' : 'Force Open'}
            </Button>
          </div>
        </Card>
      )}

      {/* ─── SCHEDULE EDITOR ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Batch Schedules
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetToDefaults}>
              <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
            </Button>
            <Button variant="primary" size="sm" onClick={addNewBatch}>
              <Plus className="w-3.5 h-3.5" /> Add Batch
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {editSchedules.map((schedule) => {
            const isExpanded = expandedSchedule === schedule.id;
            return (
              <Card key={schedule.id} className={`border-2 ${schedule.isActive ? 'border-primary/20' : 'border-border opacity-60'} transition-all`}>
                {/* Collapsed header */}
                <div
                  className="flex items-center justify-between cursor-pointer p-4"
                  onClick={() => setExpandedSchedule(isExpanded ? null : schedule.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${schedule.isActive ? 'bg-emerald-500' : 'bg-muted'}`} />
                    <div>
                      <p className="font-black text-sm">{schedule.batchName}</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        Orders {formatBatchTime(schedule.orderWindowStart)}–{formatBatchTime(schedule.orderWindowEnd)}
                        {' · '}
                        Delivery {formatBatchTime(schedule.deliveryWindowStart)}–{formatBatchTime(schedule.deliveryWindowEnd)}
                        {' · '}
                        Max {schedule.maxOrdersPerBatch}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        label="Batch Name"
                        value={schedule.batchName}
                        onChange={(e: any) => updateScheduleField(schedule.id, 'batchName', e.target.value)}
                      />
                      <Input
                        label="Max Orders"
                        type="number"
                        value={schedule.maxOrdersPerBatch}
                        onChange={(e: any) => updateScheduleField(schedule.id, 'maxOrdersPerBatch', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Input
                        label="Order Opens"
                        type="time"
                        value={schedule.orderWindowStart}
                        onChange={(e: any) => updateScheduleField(schedule.id, 'orderWindowStart', e.target.value)}
                      />
                      <Input
                        label="Order Closes"
                        type="time"
                        value={schedule.orderWindowEnd}
                        onChange={(e: any) => updateScheduleField(schedule.id, 'orderWindowEnd', e.target.value)}
                      />
                      <Input
                        label="Delivery Starts"
                        type="time"
                        value={schedule.deliveryWindowStart}
                        onChange={(e: any) => updateScheduleField(schedule.id, 'deliveryWindowStart', e.target.value)}
                      />
                      <Input
                        label="Delivery Ends"
                        type="time"
                        value={schedule.deliveryWindowEnd}
                        onChange={(e: any) => updateScheduleField(schedule.id, 'deliveryWindowEnd', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={schedule.isActive}
                          onChange={(e) => updateScheduleField(schedule.id, 'isActive', e.target.checked)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="text-sm font-bold">Active</span>
                      </label>
                      <Button variant="ghost" size="sm" onClick={() => deleteBatch(schedule.id)} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Save button */}
        {hasChanges && (
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={saveSchedules} disabled={saving} className="flex items-center gap-2 px-8">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* ─── TODAY'S LIVE DASHBOARD ─── */}
      {isEnabled && (
        <div>
          <h2 className="text-xl font-black flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-500" />
            Today's Batches — Live
          </h2>

          {batchDays.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2 border-border">
              <p className="text-muted-foreground font-medium">No batch activity yet today. Orders will appear here when the first student places an order during an active window.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {batchDays
                .filter(bd => bd.date === todayStr)
                .sort((a, b) => a.orderWindowStart.localeCompare(b.orderWindowStart))
                .map((batchDay) => {
                  const fill = getBatchFillPercent(batchDay);
                  const statusColor = STATUS_COLORS[batchDay.status] || 'gray';
                  const flow = STATUS_FLOW[batchDay.status];
                  const totalOrders = batchDay.confirmedOrders + batchDay.reservedSlots;

                  return (
                    <Card key={batchDay.id} className="border-2 border-border overflow-hidden">
                      {/* Header */}
                      <div className="p-4 border-b border-border flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm">{batchDay.batchName}</p>
                          <p className="text-xs text-muted-foreground font-medium">
                            Delivery {formatBatchTime(batchDay.deliveryWindowStart)}–{formatBatchTime(batchDay.deliveryWindowEnd)}
                          </p>
                        </div>
                        <Badge variant={statusColor as any} className="text-[10px] font-black uppercase tracking-widest">
                          {batchDay.status}
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="p-4 space-y-3">
                        {/* Order count + progress */}
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold mb-1">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              {batchDay.confirmedOrders} confirmed
                              {batchDay.reservedSlots > 0 && (
                                <span className="text-amber-500"> + {batchDay.reservedSlots} pending</span>
                              )}
                            </span>
                            <span className="text-muted-foreground">{totalOrders}/{batchDay.maxOrders}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${fill}%`,
                                background: fill >= 90
                                  ? 'linear-gradient(90deg, #EF4444, #F97316)'
                                  : fill >= 70
                                    ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                                    : 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                              }}
                            />
                          </div>
                        </div>

                        {/* Revenue */}
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          <span>₦{(batchDay.revenue || 0).toLocaleString()}</span>
                        </div>

                        {/* Hostel breakdown */}
                        {Object.keys(batchDay.hostelCounts || {}).length > 0 && (
                          <div className="text-xs">
                            <p className="font-black uppercase tracking-widest text-muted-foreground mb-1 text-[10px]">By Hostel</p>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(batchDay.hostelCounts || {}).map(([hostel, count]) => (
                                <span key={hostel} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
                                  {hostel}: {count as number}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cafeteria breakdown */}
                        {Object.keys(batchDay.cafeteriaCounts || {}).length > 0 && (
                          <div className="text-xs">
                            <p className="font-black uppercase tracking-widest text-muted-foreground mb-1 text-[10px]">By Cafeteria</p>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(batchDay.cafeteriaCounts || {}).map(([cafe, count]) => (
                                <span key={cafe} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
                                  {cafe}: {count as number}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Status transition button */}
                        {flow && batchDay.status !== 'COMPLETED' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => transitionStatus(batchDay)}
                            className={`w-full mt-2 flex items-center justify-center gap-2 ${flow.color} hover:opacity-90`}
                          >
                            {batchDay.status === 'DELIVERING' ? <CheckCircle className="w-3.5 h-3.5" /> :
                             batchDay.status === 'DISPATCHING' ? <Truck className="w-3.5 h-3.5" /> :
                             batchDay.status === 'PREPARING' ? <Package className="w-3.5 h-3.5" /> :
                             <Zap className="w-3.5 h-3.5" />}
                            {flow.label}
                          </Button>
                        )}

                        {batchDay.status === 'COMPLETED' && (
                          <div className="flex items-center justify-center gap-2 text-emerald-500 font-black text-sm mt-2">
                            <CheckCircle className="w-4 h-4" />
                            Batch Completed
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Disabled state info */}
      {!isEnabled && (
        <Card className="p-8 text-center border-dashed border-2 border-border">
          <div className="max-w-md mx-auto">
            <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-black mb-2">Order Windows Disabled</h3>
            <p className="text-muted-foreground font-medium mb-6">
              The platform is using the old hour-based system ({platformSettings?.systemOpeningHour || 10}:00–{platformSettings?.systemClosingHour || 18}:00).
              Enable order windows to switch to batch-based delivery scheduling.
            </p>
            <Button variant="primary" onClick={toggleOrderWindows}>
              Enable Order Windows
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
