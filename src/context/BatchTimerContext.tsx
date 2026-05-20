import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  subscribeToBatchSchedules,
  subscribeTodayBatchDays,
  subscribeToPlatformSettings,
  PlatformSettings,
} from '../services/db';
import type { FoodBatchSchedule, FoodBatchDay } from '../services/batchSchedule';
import {
  getActiveBatch,
  getNextBatch,
  isBatchOpen as checkBatchOpen,
  isBatchFull as checkBatchFull,
  getTimeUntilClose,
  getTimeUntilNextOpen,
  formatCountdown,
  getBatchFillPercent,
  formatBatchTime,
} from '../services/batchSchedule';

// ─── Types ───

export interface BatchTimerState {
  /** All configured schedules */
  schedules: FoodBatchSchedule[];
  /** Today's batch day docs (live order counts) */
  batchDays: FoodBatchDay[];
  /** The batch whose order window is currently open */
  activeBatch: FoodBatchSchedule | null;
  /** The next upcoming batch */
  nextBatch: FoodBatchSchedule | null;
  /** Today's batch day doc for the active batch */
  activeBatchDay: FoodBatchDay | null;
  /** Milliseconds until close (if open) or until next open (if closed) */
  countdownMs: number;
  /** Formatted countdown string "01:42:11" */
  countdownLabel: string;
  /** Whether an order window is currently open */
  isBatchOpen: boolean;
  /** Whether the active batch is at max capacity */
  isBatchFull: boolean;
  /** Current confirmed + reserved orders */
  orderCount: number;
  /** Maximum orders for active batch */
  maxOrders: number;
  /** Fill percentage 0–100 */
  fillPercent: number;
  /** Whether the order windows system is enabled in platform settings */
  isEnabled: boolean;
  /** Whether admin has forced ordering open/closed manually */
  isManualOverride: boolean;
  /** Emergency banner message from admin */
  emergencyBanner: string;
  /** Platform settings reference */
  platformSettings: PlatformSettings | null;
}

const defaultState: BatchTimerState = {
  schedules: [],
  batchDays: [],
  activeBatch: null,
  nextBatch: null,
  activeBatchDay: null,
  countdownMs: 0,
  countdownLabel: '0:00',
  isBatchOpen: false,
  isBatchFull: false,
  orderCount: 0,
  maxOrders: 0,
  fillPercent: 0,
  isEnabled: false,
  isManualOverride: false,
  emergencyBanner: '',
  platformSettings: null,
};

const BatchTimerContext = createContext<BatchTimerState>(defaultState);

// ─── Provider ───

export function BatchTimerProvider({ children }: { children: React.ReactNode }) {
  const [schedules, setSchedules] = useState<FoodBatchSchedule[]>([]);
  const [batchDays, setBatchDays] = useState<FoodBatchDay[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [tick, setTick] = useState(0); // forces re-derive every second
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Firebase listeners
  useEffect(() => {
    const unsub1 = subscribeToBatchSchedules(setSchedules);
    const unsub2 = subscribeTodayBatchDays(setBatchDays);
    const unsub3 = subscribeToPlatformSettings(setPlatformSettings);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // Single 1-second interval — the ONLY setInterval in the entire batch system
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Derive all state from schedules + batchDays + current time
  const state = useMemo<BatchTimerState>(() => {
    const now = new Date();
    const isEnabled = platformSettings?.orderWindowsEnabled === true;
    const isManualOverride = platformSettings?.orderWindowManualOverride === true;
    const emergencyBanner = platformSettings?.emergencyBannerMessage || '';

    const active = getActiveBatch(schedules, now);
    const next = getNextBatch(schedules, now);

    // Find today's batch day doc for the active batch
    const todayStr = now.toLocaleDateString('en-CA');
    const activeBatchDay = active
      ? batchDays.find(d => d.batchId === active.id && d.date === todayStr) || null
      : null;

    const isOpen = !!active;
    const isFull = checkBatchFull(activeBatchDay);
    const orderCount = activeBatchDay
      ? activeBatchDay.confirmedOrders + activeBatchDay.reservedSlots
      : 0;
    const maxOrders = activeBatchDay?.maxOrders || active?.maxOrdersPerBatch || 0;
    const fillPercent = getBatchFillPercent(activeBatchDay);

    // Countdown: if open → time until close. If closed → time until next open.
    let countdownMs = 0;
    if (active) {
      countdownMs = getTimeUntilClose(active, now);
    } else if (schedules.length > 0) {
      countdownMs = getTimeUntilNextOpen(schedules, now);
    }

    return {
      schedules,
      batchDays,
      activeBatch: active,
      nextBatch: next,
      activeBatchDay,
      countdownMs,
      countdownLabel: formatCountdown(countdownMs),
      isBatchOpen: isOpen,
      isBatchFull: isFull,
      orderCount,
      maxOrders,
      fillPercent,
      isEnabled,
      isManualOverride,
      emergencyBanner,
      platformSettings,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules, batchDays, platformSettings, tick]);

  return (
    <BatchTimerContext.Provider value={state}>
      {children}
    </BatchTimerContext.Provider>
  );
}

// ─── Hook ───

export function useBatchTimer(): BatchTimerState {
  return useContext(BatchTimerContext);
}

// Re-export the formatting helper for convenience
export { formatBatchTime };
