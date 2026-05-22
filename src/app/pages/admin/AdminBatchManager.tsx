import React, { useState, useEffect } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Input } from '../../components/design-system/Input';
import {
  Clock, Plus, Trash2, Save, ToggleLeft, ToggleRight,
  AlertTriangle, ChevronDown, ChevronUp, Users, DollarSign,
  Zap, CheckCircle, Package, Truck, RefreshCw, Shield,
  ArrowRight, Activity, Award
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
  getBatchFillPercent,
} from '../../../services/batchSchedule';
import { AdminLayout } from './AdminLayout';
import { useTheme } from '../../../context/ThemeContext';

const STATUS_FLOW: Record<string, { next: FoodBatchDay['status']; label: string; color: string; icon: any }> = {
  OPEN: { next: 'CLOSED', label: 'Close Window', color: 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600', icon: XSquare },
  CLOSED: { next: 'PREPARING', label: 'Mark Preparing', color: 'bg-blue-500 shadow-blue-500/20 hover:bg-blue-600', icon: Package },
  FULL: { next: 'PREPARING', label: 'Mark Preparing', color: 'bg-blue-500 shadow-blue-500/20 hover:bg-blue-600', icon: Package },
  PREPARING: { next: 'DISPATCHING', label: 'Start Dispatch', color: 'bg-purple-500 shadow-purple-500/20 hover:bg-purple-600', icon: Truck },
  DISPATCHING: { next: 'DELIVERING', label: 'Mark Delivering', color: 'bg-orange-500 shadow-orange-500/20 hover:bg-orange-600', icon: Truck },
  DELIVERING: { next: 'COMPLETED', label: 'Complete Batch', color: 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600', icon: CheckCircle },
};

function XSquare(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="9" x2="15" y2="15"></line>
      <line x1="15" y1="9" x2="9" y2="15"></line>
    </svg>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-sm font-semibold leading-snug text-foreground">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block h-12 w-full min-w-0 max-w-full rounded-xl border-2 border-input bg-input-background px-3 text-sm text-foreground outline-none transition-colors focus:border-secondary sm:px-4 sm:text-base"
        style={{ minWidth: 0 }}
      />
    </label>
  );
}

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

  const { adminTheme } = useTheme();
  const isDark = adminTheme === 'dark';

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

  // ─── Update Platform Setting ───
  const updatePlatformSetting = async (field: keyof PlatformSettings, value: any) => {
    try {
      const settingsRef = doc(db, 'settings', 'platform');
      await updateDoc(settingsRef, {
        [field]: value,
        updatedAt: serverTimestamp(),
      });
      toast.success('Setting updated successfully');
    } catch (err) {
      toast.error('Failed to update setting');
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
      toast.success('Batch schedules saved successfully');
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
      toast.success(`${batchDay.batchName} status updated to ${flow.next}`);
    } catch (err) {
      toast.error('Failed to update batch status');
    }
  };

  const todayStr = new Date().toLocaleDateString('en-CA');

  return (
    <AdminLayout title="Delivery Batches">
      <div className="space-y-8 pb-12">
        
        {/* Toggle Controls Panel */}
        <div className={`p-6 rounded-[2rem] border transition-all duration-300 ${
          isDark 
            ? 'bg-gradient-to-br from-[#262626] to-[#1E1E1E] border-[#333333] shadow-2xl shadow-black/10' 
            : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Batch Schedule Gating
                </h2>
              </div>
              <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Switch between the old hour-based system and the scheduled delivery batch system.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={isEnabled ? 'primary' : 'outline'}
                onClick={toggleOrderWindows}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
                  isEnabled 
                    ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/25' 
                    : isDark 
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800' 
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                {isEnabled ? 'System Active' : 'System Disabled'}
              </Button>
            </div>
          </div>
        </div>



        {/* Hybrid Delivery Settings */}
        <div className={`p-6 rounded-[2rem] border transition-all duration-300 ${
          isDark 
            ? 'bg-[#222222] border-[#333333]' 
            : 'bg-white border-gray-100 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-[#7C3AED]/10">
              <Zap className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <div>
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Hybrid Delivery Settings</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Control instant order flow, throttling, and estimates</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Instant Throttling */}
            <div className="space-y-5">
              <h3 className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Instant Delivery (Order Now)</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Enable Instant Orders</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Allow students to use the "Order Now" checkout option</p>
                </div>
                <Button 
                  variant={platformSettings?.instantOrderingEnabled !== false ? 'primary' : 'outline'}
                  onClick={() => updatePlatformSetting('instantOrderingEnabled', platformSettings?.instantOrderingEnabled === false ? true : false)}
                  className={`h-9 px-4 ${platformSettings?.instantOrderingEnabled !== false ? 'bg-[#10B981] hover:bg-[#059669] text-white border-none' : ''}`}
                >
                  {platformSettings?.instantOrderingEnabled !== false ? 'ON' : 'OFF'}
                </Button>
              </div>

              <div className="space-y-2">
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Maximum Instant Orders Allowed at Once</p>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    id="maxActiveInstantOrdersInput"
                    defaultValue={platformSettings?.maxActiveInstantOrders || 0}
                    className="w-full"
                  />
                  <Button 
                    variant="primary"
                    onClick={() => {
                      const input = document.getElementById('maxActiveInstantOrdersInput') as HTMLInputElement;
                      if (input) updatePlatformSetting('maxActiveInstantOrders', parseInt(input.value) || 0);
                    }}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white border-none shrink-0"
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>When Maximum is Reached</p>
                <div className="flex gap-2 p-1 bg-muted/30 rounded-lg">
                  <button
                    onClick={() => updatePlatformSetting('instantOverloadBehavior', 'WARN')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${platformSettings?.instantOverloadBehavior !== 'BLOCK' ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Show Warning Message
                  </button>
                  <button
                    onClick={() => updatePlatformSetting('instantOverloadBehavior', 'BLOCK')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${platformSettings?.instantOverloadBehavior === 'BLOCK' ? 'bg-red-500 text-white shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Block Instant Orders Completely
                  </button>
                </div>
              </div>
            </div>

            {/* Estimates & UX */}
            <div className="space-y-5">
              <h3 className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Batch & Delivery Settings</h3>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Allow Pre-ordering for Later Delivery Batches</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Students can pick delivery batches scheduled for later</p>
                </div>
                <Button 
                  variant={platformSettings?.allowFutureBatchPreorders === true ? 'primary' : 'outline'}
                  onClick={() => updatePlatformSetting('allowFutureBatchPreorders', !platformSettings?.allowFutureBatchPreorders)}
                  className={`h-9 px-4 ${platformSettings?.allowFutureBatchPreorders === true ? 'bg-[#10B981] hover:bg-[#059669] text-white border-none' : ''}`}
                >
                  {platformSettings?.allowFutureBatchPreorders === true ? 'ON' : 'OFF'}
                </Button>
              </div>

              <div className="space-y-2 mt-4">
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Delivery Time Estimate (Min - Max mins)</p>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    placeholder="Min"
                    id="instantDeliveryEstimateMinInput"
                    defaultValue={platformSettings?.instantDeliveryEstimateMin || ''}
                    className="w-full"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input 
                    type="number" 
                    placeholder="Max"
                    id="instantDeliveryEstimateMaxInput"
                    defaultValue={platformSettings?.instantDeliveryEstimateMax || ''}
                    className="w-full"
                  />
                </div>
                <Button 
                  variant="primary"
                  className="w-full mt-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white border-none"
                  onClick={() => {
                    const minInput = document.getElementById('instantDeliveryEstimateMinInput') as HTMLInputElement;
                    const maxInput = document.getElementById('instantDeliveryEstimateMaxInput') as HTMLInputElement;
                    if (minInput && maxInput) {
                      const min = parseInt(minInput.value);
                      const max = parseInt(maxInput.value);
                      if (!isNaN(min) && !isNaN(max)) {
                        updatePlatformSetting('instantDeliveryEstimateMin', min);
                        updatePlatformSetting('instantDeliveryEstimateMax', max);
                      }
                    }
                  }}
                >
                  Save Estimates
                </Button>
              </div>
            </div>
          </div>
        </div>



        {/* ─── SCHEDULE EDITOR ─── */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Clock className="w-6 h-6 text-[#7C3AED]" />
              Batch Rules & Intervals
            </h2>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetToDefaults}
                className={`font-bold transition-all px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 ${
                  isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={addNewBatch}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-md shadow-[#7C3AED]/20 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border-none"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Interval
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {editSchedules.map((schedule) => {
              const isExpanded = expandedSchedule === schedule.id;
              return (
                <div 
                  key={schedule.id} 
                  className={`rounded-3xl border transition-all duration-300 ${
                    schedule.isActive 
                      ? isDark 
                        ? 'bg-[#222222] border-[#333333] hover:border-[#7C3AED]/40' 
                        : 'bg-white border-gray-150 hover:border-[#7C3AED]/30 shadow-md shadow-gray-200/40'
                      : isDark
                        ? 'bg-[#222222]/50 border-gray-800 opacity-60'
                        : 'bg-white border-gray-100 opacity-60 shadow-inner'
                  }`}
                >
                  {/* Collapsed Header */}
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-start justify-between gap-3 p-4 text-left sm:items-center sm:p-5"
                    onClick={() => setExpandedSchedule(isExpanded ? null : schedule.id)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${schedule.batchName} schedule`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
                      <div className={`mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full sm:mt-0 ${
                        schedule.isActive 
                          ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' 
                          : isDark ? 'bg-gray-700' : 'bg-gray-300'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate pr-1 text-base font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {schedule.batchName}
                        </p>
                        <div className={`mt-1 grid gap-x-3 gap-y-1 text-xs font-semibold min-[380px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          <span className="min-w-0">Order window:</span>
                          <span className="font-bold text-[#7C3AED]">
                            {formatBatchTime(schedule.orderWindowStart)} – {formatBatchTime(schedule.orderWindowEnd)}
                          </span>
                          <span className="hidden sm:inline">·</span>
                          <span className="min-w-0">Delivery window:</span>
                          <span className="font-bold text-blue-500">
                            {formatBatchTime(schedule.deliveryWindowStart)} – {formatBatchTime(schedule.deliveryWindowEnd)}
                          </span>
                          <span className="hidden sm:inline">·</span>
                          <span className="min-w-0 sm:whitespace-nowrap">Cap:</span>
                          <span className="font-bold sm:whitespace-nowrap">{schedule.maxOrdersPerBatch} orders</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`flex-shrink-0 rounded-xl p-2 transition-all ${
                      isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {/* Expanded Editor Form */}
                  {isExpanded && (
                    <div className={`space-y-6 border-t p-4 sm:p-6 ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <Input
                          label="Custom Batch Identifier (e.g. Lunch batch)"
                          value={schedule.batchName}
                          onChange={(e: any) => updateScheduleField(schedule.id, 'batchName', e.target.value)}
                        />
                        <Input
                          label="Safety Cap (Max orders allowed before full state)"
                          type="number"
                          value={schedule.maxOrdersPerBatch}
                          onChange={(e: any) => updateScheduleField(schedule.id, 'maxOrdersPerBatch', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
                        <TimeField
                          label="Window Opens"
                          value={schedule.orderWindowStart}
                          onChange={(value) => updateScheduleField(schedule.id, 'orderWindowStart', value)}
                        />
                        <TimeField
                          label="Window Closes"
                          value={schedule.orderWindowEnd}
                          onChange={(value) => updateScheduleField(schedule.id, 'orderWindowEnd', value)}
                        />
                        <TimeField
                          label="Riders Depart"
                          value={schedule.deliveryWindowStart}
                          onChange={(value) => updateScheduleField(schedule.id, 'deliveryWindowStart', value)}
                        />
                        <TimeField
                          label="Estimated Close"
                          value={schedule.deliveryWindowEnd}
                          onChange={(value) => updateScheduleField(schedule.id, 'deliveryWindowEnd', value)}
                        />
                      </div>

                      <div className={`mt-2 flex flex-col gap-4 border-t border-dashed pt-5 sm:flex-row sm:items-center sm:justify-between ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                        <label className="group flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={schedule.isActive}
                            onChange={(e) => updateScheduleField(schedule.id, 'isActive', e.target.checked)}
                            className="w-5 h-5 rounded-lg border-2 border-gray-400 accent-[#7C3AED] transition-all"
                          />
                          <span className={`text-sm font-black transition-all ${
                            schedule.isActive 
                              ? 'text-[#7C3AED]' 
                              : isDark ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            Rule is Active
                          </span>
                        </label>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteBatch(schedule.id)} 
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/5 hover:text-red-600 sm:w-auto"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Interval
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Save Banner (Always visible when changes exist) */}
          {hasChanges && (
            <div className={`fixed bottom-6 right-6 left-6 md:left-auto md:w-[400px] p-4 rounded-3xl border shadow-2xl flex items-center justify-between gap-4 z-50 animate-in slide-in-from-bottom-6 ${
              isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-150'
            }`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#7C3AED] animate-pulse" />
                <div>
                  <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Unsaved Changes</p>
                  <p className="text-xs text-muted-foreground font-medium">Please confirm updates to batch rules.</p>
                </div>
              </div>
              <Button 
                variant="primary" 
                onClick={saveSchedules} 
                disabled={saving} 
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold px-6 py-2.5 rounded-2xl text-xs flex items-center gap-2 border-none"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Commit'}
              </Button>
            </div>
          )}
        </div>

        {/* Hour-based Fallback View */}
        {!isEnabled && (
          <div className={`p-10 rounded-[2.5rem] border text-center transition-all ${
            isDark ? 'bg-[#222222]/30 border-[#333333]' : 'bg-white border-gray-100 shadow-xl'
          }`}>
            <div className="max-w-md mx-auto space-y-6">
              <div className={`w-16 h-16 rounded-[1.75rem] mx-auto flex items-center justify-center ${
                isDark ? 'bg-[#2A2A2A] text-gray-500' : 'bg-gray-50 text-gray-400'
              }`}>
                <Clock className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Batch System is Inactive
                </h3>
                <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  CalebDeck is using standard operational hours ({platformSettings?.systemOpeningHour || 10}:00 – {platformSettings?.systemClosingHour || 18}:00). Students can place orders instantly at any point in this period.
                </p>
              </div>

              <div className="pt-2">
                <Button 
                  variant="primary" 
                  onClick={toggleOrderWindows}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 font-black px-8 py-4 rounded-2xl border-none"
                >
                  Enable Delivery Batches
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
