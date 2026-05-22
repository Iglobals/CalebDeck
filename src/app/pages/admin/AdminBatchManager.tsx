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

        {/* Manual Override Banner */}
        {isEnabled && (
          <div className={`p-5 rounded-3xl border transition-all duration-300 backdrop-blur-md ${
            isManualOverride 
              ? isDark 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/5' 
                : 'bg-amber-500/5 border-amber-500/10 text-amber-800 shadow-md'
              : isDark 
                ? 'bg-[#222222] border-[#333333] text-gray-400' 
                : 'bg-white border-gray-150 text-gray-600'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${isManualOverride ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-500/10 text-gray-500'}`}>
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <p className={`font-black text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Manual Override Gate</p>
                  <p className="text-sm font-medium mt-0.5">
                    {isManualOverride
                      ? '⚠️ Ordering is forced OPEN — standard batch timer and capacity checks are completely bypassed.'
                      : 'Standard batch rules apply. Students can only purchase inside active, scheduled order windows.'}
                  </p>
                </div>
              </div>
              <Button
                variant={isManualOverride ? 'primary' : 'outline'}
                size="md"
                onClick={toggleManualOverride}
                className={`rounded-xl font-bold px-6 py-2.5 transition-all ${
                  isManualOverride 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 border-none' 
                    : isDark 
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800' 
                      : 'border-gray-250 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isManualOverride ? 'Restore Rules' : 'Force Open Now'}
              </Button>
            </div>
          </div>
        )}

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
                    value={platformSettings?.maxActiveInstantOrders || 0}
                    onChange={(e) => updatePlatformSetting('maxActiveInstantOrders', parseInt(e.target.value))}
                    className="w-full"
                  />
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
                    value={platformSettings?.instantDeliveryEstimateMin || ''}
                    onChange={(e) => updatePlatformSetting('instantDeliveryEstimateMin', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input 
                    type="number" 
                    placeholder="Max"
                    value={platformSettings?.instantDeliveryEstimateMax || ''}
                    onChange={(e) => updatePlatformSetting('instantDeliveryEstimateMax', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── LIVE STATUS DASHBOARD ─── */}
        {isEnabled && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Activity className="w-6 h-6 text-[#7C3AED]" />
                Live Status Tracker
              </h2>
              <span className={`text-xs font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full ${
                isDark ? 'bg-[#2E2E2E] text-[#9C8F7F]' : 'bg-gray-150 text-gray-500'
              }`}>
                Today's Windows
              </span>
            </div>

            {batchDays.length === 0 ? (
              <Card className={`p-10 text-center border-dashed border-2 ${
                isDark ? 'border-[#333333] bg-[#222222]/30' : 'border-gray-200 bg-gray-50/50'
              } rounded-[2rem]`}>
                <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className={`font-bold text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Waiting for active batch orders...</p>
                <p className="text-xs text-muted-foreground mt-1">Live metrics populate as soon as the first order in any batch window is received.</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {batchDays
                  .filter(bd => bd.date === todayStr)
                  .sort((a, b) => a.orderWindowStart.localeCompare(b.orderWindowStart))
                  .map((batchDay) => {
                    const fill = getBatchFillPercent(batchDay);
                    const statusColor = STATUS_COLORS[batchDay.status] || 'gray';
                    const flow = STATUS_FLOW[batchDay.status];
                    const totalOrders = batchDay.confirmedOrders + batchDay.reservedSlots;
                    const StatusIcon = flow?.icon || Zap;

                    return (
                      <div 
                        key={batchDay.id} 
                        className={`rounded-[2rem] border overflow-hidden transition-all duration-300 hover:translate-y-[-4px] flex flex-col justify-between ${
                          isDark 
                            ? 'bg-[#222222] border-[#333333] hover:border-[#7C3AED]/30 shadow-xl shadow-black/10' 
                            : 'bg-white border-gray-100 hover:border-[#7C3AED]/20 shadow-lg shadow-gray-150/40'
                        }`}
                      >
                        {/* Header */}
                        <div className={`p-5 border-b flex items-center justify-between ${
                          isDark ? 'border-[#333333] bg-[#2A2A2A]/40' : 'border-gray-100 bg-gray-50/30'
                        }`}>
                          <div className="space-y-0.5">
                            <p className={`font-black text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {batchDay.batchName}
                            </p>
                            <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              Delivery {formatBatchTime(batchDay.deliveryWindowStart)}–{formatBatchTime(batchDay.deliveryWindowEnd)}
                            </p>
                          </div>
                          <Badge variant={statusColor as any} className="text-[10px] font-black uppercase tracking-widest px-3 py-1">
                            {batchDay.status}
                          </Badge>
                        </div>

                        {/* Stats Body */}
                        <div className="p-6 space-y-5 flex-1">
                          
                          {/* Order progress stats */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className={`flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                <Users className="w-4 h-4 text-[#7C3AED]" />
                                {batchDay.confirmedOrders} Confirmed
                                {batchDay.reservedSlots > 0 && (
                                  <span className="text-amber-500"> (+{batchDay.reservedSlots} holding)</span>
                                )}
                              </span>
                              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                {totalOrders} / {batchDay.maxOrders} max
                              </span>
                            </div>
                            
                            <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, fill)}%`,
                                  background: fill >= 90
                                    ? 'linear-gradient(90deg, #EF4444, #F97316)'
                                    : fill >= 75
                                      ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                                      : 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                                }}
                              />
                            </div>
                          </div>

                          {/* Financial KPI */}
                          <div className={`p-3 rounded-2xl flex items-center justify-between border ${
                            isDark ? 'bg-[#2A2A2A]/50 border-gray-800' : 'bg-gray-50 border-gray-100'
                          }`}>
                            <span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Cumulative Revenue</span>
                            <div className="flex items-center gap-1 font-black text-emerald-500 text-sm">
                              <DollarSign className="w-4 h-4" />
                              <span>₦{(batchDay.revenue || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Hostel pill breakdown */}
                          {Object.keys(batchDay.hostelCounts || {}).length > 0 && (
                            <div className="space-y-2">
                              <p className={`font-black uppercase tracking-widest text-[9px] ${
                                isDark ? 'text-gray-500' : 'text-gray-400'
                              }`}>Destination Breakdown</p>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(batchDay.hostelCounts || {}).map(([hostel, count]) => (
                                  <span 
                                    key={hostel} 
                                    className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide border transition-all ${
                                      isDark 
                                        ? 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300' 
                                        : 'bg-white border-gray-150 text-gray-700 shadow-sm'
                                    }`}
                                  >
                                    {hostel}: <span className="text-[#7C3AED] font-black">{count as number}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Cafeteria breakdown */}
                          {Object.keys(batchDay.cafeteriaCounts || {}).length > 0 && (
                            <div className="space-y-2">
                              <p className={`font-black uppercase tracking-widest text-[9px] ${
                                isDark ? 'text-gray-500' : 'text-gray-400'
                              }`}>Cafeteria Load</p>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(batchDay.cafeteriaCounts || {}).map(([cafe, count]) => (
                                  <span 
                                    key={cafe} 
                                    className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide border transition-all ${
                                      isDark 
                                        ? 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300' 
                                        : 'bg-white border-gray-150 text-gray-700 shadow-sm'
                                    }`}
                                  >
                                    {cafe}: <span className="text-blue-500 font-black">{count as number}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Transition Actions Area */}
                        <div className={`p-4 border-t ${isDark ? 'border-[#333333] bg-[#2A2A2A]/20' : 'border-gray-100 bg-gray-50/20'}`}>
                          {flow && batchDay.status !== 'COMPLETED' ? (
                            <button
                              onClick={() => transitionStatus(batchDay)}
                              className={`w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2.5 transition-all duration-300 active:scale-98 cursor-pointer shadow-lg hover:shadow-xl ${flow.color}`}
                            >
                              <StatusIcon className="w-4.5 h-4.5" />
                              {flow.label}
                            </button>
                          ) : (
                            <div className="py-3 flex items-center justify-center gap-2 text-emerald-500 font-black text-sm">
                              <Award className="w-5 h-5 animate-bounce" />
                              <span>Batch Completed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

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
                  <div
                    className="flex items-center justify-between cursor-pointer p-5"
                    onClick={() => setExpandedSchedule(isExpanded ? null : schedule.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3.5 h-3.5 rounded-full ${
                        schedule.isActive 
                          ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' 
                          : isDark ? 'bg-gray-700' : 'bg-gray-300'
                      }`} />
                      <div>
                        <p className={`font-black text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {schedule.batchName}
                        </p>
                        <div className={`flex flex-wrap items-center gap-x-2 text-xs font-semibold mt-0.5 ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          <span>Order window:</span>
                          <span className="text-[#7C3AED] font-bold">
                            {formatBatchTime(schedule.orderWindowStart)} – {formatBatchTime(schedule.orderWindowEnd)}
                          </span>
                          <span className="hidden sm:inline">·</span>
                          <span>Delivery window:</span>
                          <span className="text-blue-500 font-bold">
                            {formatBatchTime(schedule.deliveryWindowStart)} – {formatBatchTime(schedule.deliveryWindowEnd)}
                          </span>
                          <span className="hidden sm:inline">·</span>
                          <span>Cap:</span>
                          <span className="font-bold">{schedule.maxOrdersPerBatch} orders</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-2 rounded-xl transition-all ${
                      isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Expanded Editor Form */}
                  {isExpanded && (
                    <div className={`border-t p-6 space-y-6 ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
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
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                        <Input
                          label="Window Opens"
                          type="time"
                          value={schedule.orderWindowStart}
                          onChange={(e: any) => updateScheduleField(schedule.id, 'orderWindowStart', e.target.value)}
                        />
                        <Input
                          label="Window Closes"
                          type="time"
                          value={schedule.orderWindowEnd}
                          onChange={(e: any) => updateScheduleField(schedule.id, 'orderWindowEnd', e.target.value)}
                        />
                        <Input
                          label="Riders Depart"
                          type="time"
                          value={schedule.deliveryWindowStart}
                          onChange={(e: any) => updateScheduleField(schedule.id, 'deliveryWindowStart', e.target.value)}
                        />
                        <Input
                          label="Estimated Close"
                          type="time"
                          value={schedule.deliveryWindowEnd}
                          onChange={(e: any) => updateScheduleField(schedule.id, 'deliveryWindowEnd', e.target.value)}
                        />
                      </div>

                      <div className="flex items-center justify-between border-t border-dashed pt-5 mt-2 border-gray-800">
                        <label className="flex items-center gap-3 cursor-pointer group">
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
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/5 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
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
