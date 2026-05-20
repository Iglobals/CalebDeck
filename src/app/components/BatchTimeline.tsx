import React from 'react';
import { useBatchTimer, formatBatchTime } from '../../context/BatchTimerContext';
import { Card } from '../components/design-system/Card';
import { CheckCircle, Clock, Circle } from 'lucide-react';
import type { FoodBatchSchedule, FoodBatchDay } from '../../services/batchSchedule';
import { isBatchOpen as checkBatchOpen } from '../../services/batchSchedule';

interface BatchTimelineProps {
  className?: string;
  /** Highlight a specific batch by ID (e.g. the one the order belongs to) */
  highlightBatchId?: string;
}

/**
 * CalebDeck BatchTimeline
 *
 * Horizontal timeline showing the day's batch windows with status.
 * Each step shows the batch name, current state, and delivery time.
 *
 * ● Breakfast       ● Lunch          ○ Dinner
 *   ✓ Completed       Delivering       Opens 4:00pm
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
export function BatchTimeline({ className = '', highlightBatchId }: BatchTimelineProps) {
  const { schedules, batchDays, isEnabled } = useBatchTimer();

  if (!isEnabled || schedules.length === 0) return null;

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA');

  // Sort by order window start
  const sortedSchedules = [...schedules]
    .filter(s => s.isActive)
    .sort((a, b) => {
      const aMin = parseInt(a.orderWindowStart.split(':')[0]) * 60 + parseInt(a.orderWindowStart.split(':')[1]);
      const bMin = parseInt(b.orderWindowStart.split(':')[0]) * 60 + parseInt(b.orderWindowStart.split(':')[1]);
      return aMin - bMin;
    });

  const getStepState = (schedule: FoodBatchSchedule): 'completed' | 'active' | 'upcoming' | 'highlighted' => {
    if (highlightBatchId && schedule.id === highlightBatchId) return 'highlighted';

    const batchDay = batchDays.find(d => d.batchId === schedule.id && d.date === todayStr);
    if (batchDay?.status === 'COMPLETED') return 'completed';
    if (batchDay?.status === 'DELIVERING' || batchDay?.status === 'DISPATCHING' || batchDay?.status === 'PREPARING') return 'active';
    if (checkBatchOpen(schedule, now)) return 'active';
    
    // Check if this batch's delivery window has passed
    const [endH, endM] = schedule.deliveryWindowEnd.split(':').map(Number);
    const endMinutes = endH * 60 + endM;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes > endMinutes) return 'completed';

    return 'upcoming';
  };

  const getStatusLabel = (schedule: FoodBatchSchedule, state: string): string => {
    const batchDay = batchDays.find(d => d.batchId === schedule.id && d.date === todayStr);
    if (state === 'highlighted') return 'Your batch';
    if (batchDay?.status === 'COMPLETED') return 'Completed';
    if (batchDay?.status === 'DELIVERING') return 'Delivering';
    if (batchDay?.status === 'DISPATCHING') return 'Dispatching';
    if (batchDay?.status === 'PREPARING') return 'Preparing';
    if (state === 'active') return 'Ordering now';
    return `Opens ${formatBatchTime(schedule.orderWindowStart)}`;
  };

  return (
    <Card className={`p-4 sm:p-5 overflow-x-auto ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4">Today's Schedule</p>
      <div className="flex items-start gap-0 min-w-0">
        {sortedSchedules.map((schedule, idx) => {
          const state = getStepState(schedule);
          const label = getStatusLabel(schedule, state);
          const isLast = idx === sortedSchedules.length - 1;

          return (
            <div key={schedule.id} className="flex items-start flex-1 min-w-0">
              {/* Step */}
              <div className="flex flex-col items-center text-center min-w-[72px]">
                {/* Icon */}
                <div className="relative mb-2">
                  {state === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  ) : state === 'active' || state === 'highlighted' ? (
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#7C3AED]/30 animate-ping" />
                      <div className="relative w-6 h-6 rounded-full bg-[#7C3AED] flex items-center justify-center">
                        <Clock className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground/30" />
                  )}
                </div>

                {/* Batch name */}
                <p className={`text-[11px] font-black leading-tight mb-0.5 truncate w-full ${
                  state === 'active' || state === 'highlighted'
                    ? 'text-[#7C3AED]'
                    : state === 'completed'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                }`}>
                  {schedule.batchName.replace(' Batch', '')}
                </p>

                {/* Status label */}
                <p className={`text-[9px] font-bold uppercase tracking-wider ${
                  state === 'active' || state === 'highlighted'
                    ? 'text-[#7C3AED]/70'
                    : 'text-muted-foreground/50'
                }`}>
                  {label}
                </p>

                {/* Delivery time */}
                <p className="text-[9px] font-semibold text-muted-foreground/40 mt-0.5">
                  {formatBatchTime(schedule.deliveryWindowStart)}–{formatBatchTime(schedule.deliveryWindowEnd)}
                </p>
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div className="flex-1 flex items-center pt-3 px-1 min-w-[12px]">
                  <div
                    className={`h-[2px] w-full rounded-full transition-colors ${
                      state === 'completed'
                        ? 'bg-emerald-500/50'
                        : state === 'active' || state === 'highlighted'
                          ? 'bg-gradient-to-r from-[#7C3AED] to-muted'
                          : 'bg-muted'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
