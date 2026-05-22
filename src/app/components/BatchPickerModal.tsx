import React from 'react';
import { X, Package, Clock } from 'lucide-react';
import { BatchClock } from './BatchClock';
import { useBatchTimer, formatBatchTime } from '../../context/BatchTimerContext';
import { Badge } from './design-system/Badge';

interface SelectedBatchInfo {
  batchId: string;
  batchName: string;
  orderWindowStart: string;
  orderWindowEnd: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
}

interface BatchPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBatch: (batch: SelectedBatchInfo) => void;
  allowFutureBatchPreorders: boolean;
}

export function BatchPickerModal({ isOpen, onClose, onSelectBatch, allowFutureBatchPreorders }: BatchPickerModalProps) {
  const batchTimer = useBatchTimer();

  if (!isOpen || !batchTimer.isEnabled) return null;

  const schedules = batchTimer.schedules.filter(s => s.isActive);
  
  const getBatchStatus = (scheduleId: string) => {
    // If it's the active batch
    if (batchTimer.activeBatch?.id === scheduleId) {
      if (batchTimer.isBatchFull) return 'FULL';
      if (batchTimer.fillPercent >= 80) return 'ALMOST_FULL';
      return 'OPEN';
    }
    
    // Find its schedule details
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return 'CLOSED';
    
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = schedule.orderWindowStart.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    
    if (startMinutes > nowMinutes) return 'UPCOMING';
    return 'CLOSED'; // Already passed today
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl max-h-[90vh] bg-card sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl flex flex-col border border-border animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-border">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Package className="w-6 h-6 text-[#7C3AED]" />
              Select Delivery Batch
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Choose a scheduled delivery window for your order
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center hover:bg-secondary/20 transition-colors"
          >
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        {/* Batch List */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
          {schedules.map((schedule) => {
            const status = getBatchStatus(schedule.id);
            const isSelectable = status === 'OPEN' || status === 'ALMOST_FULL' || (allowFutureBatchPreorders && status === 'UPCOMING');
            
            // Format times for display
            const orderWindowStart = formatBatchTime(schedule.orderWindowStart);
            const orderWindowEnd = formatBatchTime(schedule.orderWindowEnd);
            const deliveryWindowStart = formatBatchTime(schedule.deliveryWindowStart);
            const deliveryWindowEnd = formatBatchTime(schedule.deliveryWindowEnd);

            return (
              <div 
                key={schedule.id}
                onClick={() => {
                  if (isSelectable) {
                    onSelectBatch({
                      batchId: schedule.id,
                      batchName: schedule.batchName,
                      orderWindowStart: schedule.orderWindowStart,
                      orderWindowEnd: schedule.orderWindowEnd,
                      deliveryWindowStart: schedule.deliveryWindowStart,
                      deliveryWindowEnd: schedule.deliveryWindowEnd,
                    });
                  }
                }}
                className={`
                  relative overflow-hidden rounded-2xl border-2 transition-all duration-300
                  ${isSelectable 
                    ? 'border-border hover:border-[#7C3AED]/50 bg-card/50 cursor-pointer hover:shadow-lg hover:shadow-[#7C3AED]/5' 
                    : 'border-border/50 bg-muted/20 opacity-70 cursor-not-allowed grayscale-[0.5]'}
                `}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        {schedule.batchName}
                        {status === 'OPEN' && <Badge variant="green">Open Now</Badge>}
                        {status === 'ALMOST_FULL' && <Badge variant="amber">Almost Full</Badge>}
                        {status === 'FULL' && <Badge variant="red">Batch Full</Badge>}
                        {status === 'CLOSED' && <Badge variant="gray">Closed</Badge>}
                        {status === 'UPCOMING' && <Badge variant="primary">{allowFutureBatchPreorders ? 'Pre-order Open' : 'Opening Soon'}</Badge>}
                      </h3>
                      <p className="text-sm font-semibold text-[#7C3AED] mt-1 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> 
                        Delivery Window: {deliveryWindowStart}–{deliveryWindowEnd}
                      </p>
                    </div>
                    
                    {/* Compact Clock for Active/Upcoming */}
                    {(status === 'OPEN' || status === 'ALMOST_FULL' || status === 'UPCOMING') && (
                      <div className="w-16 h-16 flex-shrink-0">
                        <BatchClock 
                          isOpen={status === 'OPEN' || status === 'ALMOST_FULL'} 
                          size="sm" 
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Order Window</span>
                      <span>{orderWindowStart} – {orderWindowEnd}</span>
                    </div>

                    {/* Capacity Bar (only for active batch) */}
                    {batchTimer.activeBatch?.id === schedule.id && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-foreground">Capacity</span>
                          <span className={status === 'ALMOST_FULL' ? 'text-amber-500' : status === 'FULL' ? 'text-red-500' : 'text-[#7C3AED]'}>
                            {Math.round(batchTimer.fillPercent)}% Full
                          </span>
                        </div>
                        <div className="h-2 w-full bg-secondary/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              status === 'FULL' ? 'bg-red-500' : 
                              status === 'ALMOST_FULL' ? 'bg-amber-500' : 
                              'bg-gradient-to-r from-[#7C3AED] to-secondary'
                            }`}
                            style={{ width: \`\${Math.min(batchTimer.fillPercent, 100)}%\` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Non-selectable overlays / messages */}
                  {status === 'FULL' && (
                    <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold text-center">
                      This batch has reached maximum capacity.
                    </div>
                  )}
                  {status === 'CLOSED' && (
                    <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border text-muted-foreground text-sm font-bold text-center">
                      Order window has closed for today.
                    </div>
                  )}
                  {status === 'UPCOMING' && !allowFutureBatchPreorders && (
                    <div className="mt-4 p-3 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#7C3AED] text-sm font-bold text-center">
                      Opens at {orderWindowStart}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
