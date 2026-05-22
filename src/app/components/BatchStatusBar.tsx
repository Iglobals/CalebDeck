import React from 'react';
import { BatchClock } from './BatchClock';
import { Badge } from '../components/design-system/Badge';
import { Button } from '../components/design-system/Button';
import { Card } from '../components/design-system/Card';
import { useBatchTimer, formatBatchTime } from '../../context/BatchTimerContext';
import { Clock, Users, ArrowRight, Sparkles, Timer } from 'lucide-react';

interface BatchStatusBarProps {
  /** Compact mode for checkout (less padding, no progress bar) */
  compact?: boolean;
  className?: string;
  /** Called when user clicks "Join Next Batch" — parent handles navigation */
  onJoinNextBatch?: () => void;
}

/**
 * CalebDeck BatchStatusBar
 *
 * Premium status bar combining the branded clock, live countdown,
 * batch progress, and capacity indicators.
 *
 * Renders different states:
 * - OPEN: countdown to close, order count, progress bar
 * - CLOSED: countdown to next open, next batch name
 * - FULL: batch full message + "Join Next Batch" CTA
 * - DISABLED: order windows not enabled (renders nothing)
 */
export function BatchStatusBar({ compact = false, className = '', onJoinNextBatch }: BatchStatusBarProps) {
  const {
    isEnabled,
    isManualOverride,
    emergencyBanner,
    isBatchOpen,
    isBatchFull,
    activeBatch,
    nextBatch,
    activeBatchDay,
    countdownMs,
    countdownLabel,
    orderCount,
    maxOrders,
    fillPercent,
  } = useBatchTimer();

  // If order windows are not enabled, don't render
  if (!isEnabled && !isManualOverride) return null;

  // Emergency banner overrides everything
  if (emergencyBanner) {
    return (
      <Card className={`border-2 border-amber-500/30 bg-amber-500/5 ${className}`}>
        <div className="flex items-center gap-4 p-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Notice</p>
            <p className="text-sm font-semibold text-foreground leading-relaxed">{emergencyBanner}</p>
          </div>
        </div>
      </Card>
    );
  }

  // ─── BATCH OPEN ───
  if (isBatchOpen && activeBatch && !isBatchFull) {
    const isClosingSoon = countdownMs < 15 * 60 * 1000; // < 15 min
    const isAlmostFull = fillPercent >= 80;

    return (
      <Card className={`border-2 border-y-[#7C3AED]/20 border-r-[#7C3AED]/20 border-l-[#FCD34D] border-l-4 bg-gradient-to-r from-[#7C3AED]/5 to-[#FCD34D]/5 overflow-hidden ${className}`}>
        <div className={`flex items-center gap-4 ${compact ? 'p-3' : 'p-5'}`}>
          {!compact && <BatchClock size={64} />}

          <div className="flex-1 min-w-0">
            {/* Status header */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7C3AED]">
                {activeBatch.batchName} — Open
              </p>
            </div>

            {/* Delivery promise — psychologically reassuring copy */}
            <p className="text-sm font-semibold text-foreground leading-snug">
              Order now — your food arrives between{' '}
              <span className="font-black text-amber-600 dark:text-[#FCD34D]">
                {formatBatchTime(activeBatch.deliveryWindowStart)}–{formatBatchTime(activeBatch.deliveryWindowEnd)}
              </span>
            </p>

            {/* Countdown + capacity */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <Timer className="w-3.5 h-3.5" />
                {isClosingSoon ? (
                  <span className="text-amber-600 dark:text-amber-400 font-black">
                    Closes in {countdownLabel}
                  </span>
                ) : (
                  <span>Window closes in {countdownLabel}</span>
                )}
              </div>
              {maxOrders > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span className={isAlmostFull ? 'text-amber-600 dark:text-amber-400 font-black' : ''}>
                    {orderCount}/{maxOrders} {isAlmostFull ? '— Almost full' : 'orders'}
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar (non-compact only) */}
            {!compact && maxOrders > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${fillPercent}%`,
                    background: fillPercent >= 80
                      ? 'linear-gradient(90deg, #7C3AED, #FCD34D)'
                      : 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // ─── BATCH FULL ───
  if (isBatchOpen && isBatchFull && activeBatch) {
    return (
      <Card className={`border-2 border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent ${className}`}>
        <div className={`${compact ? 'p-3' : 'p-5'}`}>
          <div className="flex items-center gap-4">
            {!compact && <BatchClock size={64} />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="amber" className="text-[10px] font-black uppercase tracking-widest">Batch Full</Badge>
              </div>
              <p className="text-sm font-semibold text-foreground leading-snug">
                {activeBatch.batchName} has reached capacity ({maxOrders}/{maxOrders} orders).
              </p>

              {/* Social proof — makes fullness feel like demand, not limitation */}
              <p className="text-xs font-medium text-muted-foreground mt-1">
                {maxOrders} students already secured their delivery slot
              </p>
            </div>
          </div>

          {/* Join Next Batch CTA */}
          {nextBatch && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-[#7C3AED]/5 border border-[#7C3AED]/20">
              <Sparkles className="w-5 h-5 text-[#7C3AED] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-foreground">{nextBatch.batchName}</p>
                <p className="text-xs font-medium text-muted-foreground">
                  Delivery {formatBatchTime(nextBatch.deliveryWindowStart)}–{formatBatchTime(nextBatch.deliveryWindowEnd)}
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={onJoinNextBatch}
                className="flex items-center gap-1.5 flex-shrink-0"
              >
                Join <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // ─── CLOSED (between batches) ───
  return (
    <Card className={`border-2 border-border bg-gradient-to-r from-muted/50 to-transparent ${className}`}>
      <div className={`flex items-center gap-4 ${compact ? 'p-3' : 'p-5'}`}>
        {!compact && <BatchClock size={64} />}
        <div className="flex-1 min-w-0">
          {nextBatch ? (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-muted-foreground/40" />
                </span>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Next: {nextBatch.batchName}
                </p>
              </div>

              {/* Anticipation copy — makes waiting feel intentional */}
              <p className="text-sm font-semibold text-foreground leading-snug">
                Ordering opens at{' '}
                <span className="font-black">
                  {formatBatchTime(nextBatch.orderWindowStart)}
                </span>
                {' '}for delivery by{' '}
                <span className="font-black text-[#7C3AED]">
                  {formatBatchTime(nextBatch.deliveryWindowStart)}
                </span>
              </p>

              <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-muted-foreground">
                <Timer className="w-3.5 h-3.5" />
                <span>Opens in {countdownLabel}</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                All batches completed
              </p>
              <p className="text-sm font-semibold text-foreground">
                Today's delivery windows have ended. Fresh batches open tomorrow morning — your meals, always on schedule.
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
