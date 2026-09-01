import React from 'react';
import { X, Package, Clock } from 'lucide-react';
import { Badge } from './design-system/Badge';
import { FashionBatchState, formatArrivalDate } from '../../services/fashionBatch';
import { BatchClock } from './BatchClock';

export interface SelectedFashionBatchInfo {
  batchName: string;
  expectedArrivalDate: Date;
  status: 'OPEN' | 'UPCOMING' | 'CLOSED';
}

interface FashionBatchPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBatch: (batch: SelectedFashionBatchInfo) => void;
  batchState: FashionBatchState;
}

export function FashionBatchPickerModal({ isOpen, onClose, onSelectBatch, batchState }: FashionBatchPickerModalProps) {
  if (!isOpen) return null;

  const status = batchState.isOpen || batchState.isGracePeriod ? 'OPEN' : 'UPCOMING';
  const isSelectable = true; // For fashion, you can always select the active or next batch
  
  const handleSelect = () => {
    onSelectBatch({
      batchName: batchState.currentBatchLabel,
      expectedArrivalDate: batchState.expectedArrivalDate,
      status
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl max-h-[90vh] bg-card sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl flex flex-col border border-border animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-border">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Package className="w-6 h-6 text-[#F97316]" />
              Fashion Delivery Batch
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Select your delivery window for this order
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center hover:bg-secondary/20 transition-colors"
          >
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        {/* Batch List (Just one active/upcoming for fashion) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
          <div 
            onClick={handleSelect}
            className={`
              relative overflow-hidden rounded-2xl border-2 transition-all duration-300
              border-[#F97316] bg-[#F97316]/5 shadow-lg shadow-[#F97316]/10 scale-[1.01] cursor-pointer
            `}
          >
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-[#F97316] bg-[#F97316] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {batchState.currentBatchLabel}
                    {status === 'OPEN' ? (
                      <Badge variant="green">Open Now</Badge>
                    ) : (
                      <Badge variant="primary">Pre-order Open</Badge>
                    )}
                  </h3>
                  <p className="text-sm font-semibold text-[#F97316] mt-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> 
                    Expected Arrival: {formatArrivalDate(batchState.expectedArrivalDate)}
                  </p>
                </div>
                
                <div className="w-16 h-16 flex-shrink-0">
                  <BatchClock 
                    isOpen={status === 'OPEN'} 
                    size={64} 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>Order Window Closes</span>
                  <span>{formatArrivalDate(batchState.nextCloseDate)}</span>
                </div>
              </div>

              {status === 'UPCOMING' && (
                <div className="mt-4 p-3 rounded-xl bg-[#F97316]/10 border border-[#F97316]/20 text-[#F97316] text-sm font-bold text-center">
                  Ordering is currently closed but you can pre-order for the next batch.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
