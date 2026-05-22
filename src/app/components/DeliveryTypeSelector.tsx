import React from 'react';
import { Zap, Package, ChevronRight, AlertTriangle, Sparkles } from 'lucide-react';

interface SelectedBatchInfo {
  batchId: string;
  batchName: string;
  orderWindowStart: string;
  orderWindowEnd: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
}

interface DeliveryTypeSelectorProps {
  selectedType: 'INSTANT' | 'BATCH';
  onSelectType: (type: 'INSTANT' | 'BATCH') => void;
  selectedBatch: SelectedBatchInfo | null;
  onOpenBatchPicker: () => void;
  isBatchSystemEnabled: boolean;
  recommendedType: 'INSTANT' | 'BATCH';
  instantThrottleState: 'OK' | 'WARN' | 'BLOCKED';
  instantEstimateMin?: number;
  instantEstimateMax?: number;
}

const formatTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hr = h % 12 || 12;
  return m === 0 ? `${hr}${ampm}` : `${hr}:${m.toString().padStart(2, '0')}${ampm}`;
};

export function DeliveryTypeSelector({
  selectedType,
  onSelectType,
  selectedBatch,
  onOpenBatchPicker,
  isBatchSystemEnabled,
  recommendedType,
  instantThrottleState,
  instantEstimateMin,
  instantEstimateMax,
}: DeliveryTypeSelectorProps) {
  const isInstantBlocked = instantThrottleState === 'BLOCKED';
  const showThrottleWarning = instantThrottleState === 'WARN';

  // Order cards: recommended type first
  const cards: ('INSTANT' | 'BATCH')[] = recommendedType === 'BATCH' && isBatchSystemEnabled
    ? ['BATCH', 'INSTANT']
    : ['INSTANT', 'BATCH'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shadow-lg">
          <Package className="w-6 h-6 text-secondary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">How should we deliver?</h2>
          <p className="text-sm text-muted-foreground font-medium">Choose what works best for you right now</p>
        </div>
      </div>

      {/* Throttle Warning */}
      {showThrottleWarning && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            High order volume right now. For a more predictable delivery experience, consider joining a scheduled batch.
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {cards.map((type) => {
          if (type === 'INSTANT') {
            const isSelected = selectedType === 'INSTANT';
            const isRecommended = recommendedType === 'INSTANT' && isBatchSystemEnabled;

            return (
              <button
                key="INSTANT"
                type="button"
                disabled={isInstantBlocked}
                onClick={() => onSelectType('INSTANT')}
                className={`
                  relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 group
                  ${isInstantBlocked
                    ? 'opacity-50 cursor-not-allowed border-border bg-muted/30'
                    : isSelected
                      ? 'border-[#7C3AED] bg-[#7C3AED]/5 shadow-lg shadow-[#7C3AED]/10 scale-[1.01]'
                      : 'border-border hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/[0.02] bg-card/50'
                  }
                `}
              >
                {/* Selection indicator */}
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-[#7C3AED] bg-[#7C3AED]' : 'border-muted-foreground/30'}`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>

                <div className="flex items-start gap-4 pr-8">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[#7C3AED] shadow-lg shadow-[#7C3AED]/30' : 'bg-amber-500/10'}`}>
                    <Zap className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold">Order Now</h3>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        Standard
                      </span>
                      {isRecommended && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      Your order gets processed immediately once payment is confirmed. Delivery time depends on cafeteria queue, rider availability, and current order volume.
                    </p>
                    {instantEstimateMin && instantEstimateMax && !isInstantBlocked && (
                      <p className="text-xs font-bold text-muted-foreground/70 mt-1.5">
                        Estimated delivery: {instantEstimateMin}–{instantEstimateMax} minutes
                      </p>
                    )}
                    {isInstantBlocked && (
                      <p className="text-xs font-bold text-red-500 dark:text-red-400 mt-1.5">
                        Temporarily paused due to high demand — join a delivery batch instead
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          }

          if (type === 'BATCH' && isBatchSystemEnabled) {
            const isSelected = selectedType === 'BATCH';
            const isRecommended = recommendedType === 'BATCH';

            return (
              <button
                key="BATCH"
                type="button"
                onClick={() => {
                  onSelectType('BATCH');
                  if (!selectedBatch) onOpenBatchPicker();
                }}
                className={`
                  relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 group
                  ${isSelected
                    ? 'border-[#7C3AED] bg-[#7C3AED]/5 shadow-lg shadow-[#7C3AED]/10 scale-[1.01]'
                    : 'border-border hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/[0.02] bg-card/50'
                  }
                `}
              >
                {/* Selection indicator */}
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-[#7C3AED] bg-[#7C3AED]' : 'border-muted-foreground/30'}`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>

                <div className="flex items-start gap-4 pr-8">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[#7C3AED] shadow-lg shadow-[#7C3AED]/30' : 'bg-[#7C3AED]/10'}`}>
                    <Package className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#7C3AED]'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold">Join a Delivery Batch</h3>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED]">
                        Scheduled
                      </span>
                      {isRecommended && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      Pick a scheduled batch and your order is prepared and dispatched together with others for a smoother, more predictable delivery window.
                    </p>

                    {/* Selected batch summary */}
                    {selectedBatch && isSelected ? (
                      <div
                        onClick={(e) => { e.stopPropagation(); onOpenBatchPicker(); }}
                        className="mt-3 p-3 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-between cursor-pointer hover:bg-[#7C3AED]/15 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#7C3AED]">{selectedBatch.batchName}</p>
                          <p className="text-xs font-semibold text-muted-foreground">
                            Delivery {formatTime(selectedBatch.deliveryWindowStart)}–{formatTime(selectedBatch.deliveryWindowEnd)}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#7C3AED]" />
                      </div>
                    ) : isSelected ? (
                      <div
                        onClick={(e) => { e.stopPropagation(); onOpenBatchPicker(); }}
                        className="mt-3 p-3 rounded-xl border-2 border-dashed border-[#7C3AED]/30 flex items-center justify-center gap-2 cursor-pointer hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/5 transition-colors"
                      >
                        <span className="text-sm font-bold text-[#7C3AED]">Select a batch</span>
                        <ChevronRight className="w-4 h-4 text-[#7C3AED]" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

export type { SelectedBatchInfo, DeliveryTypeSelectorProps };
