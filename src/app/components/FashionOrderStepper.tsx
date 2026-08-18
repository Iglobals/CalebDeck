import React from 'react';
import {
  ShoppingBag,
  Clock,
  Lock,
  Package,
  Truck,
  MapPin,
  PackageCheck,
  CircleDot,
  CheckCircle2,
} from 'lucide-react';

/**
 * Fashion Order Status Stepper
 *
 * Vertical 9-step pipeline for fashion batch orders.
 * Uses the same squircle/accent language as the rest of CalebDeck.
 * Only rendered for fashion orders — food/mart use the existing horizontal ProgressStepper.
 */

const FASHION_STEPS = [
  { key: 'ORDER_PLACED', label: 'Order Placed', description: 'Your order is confirmed', icon: ShoppingBag },
  { key: 'BATCH_ACTIVE', label: 'Batch Active', description: 'Collecting orders for this week', icon: Clock },
  { key: 'BATCH_CLOSED', label: 'Batch Closed', description: 'Order window has closed', icon: Lock },
  { key: 'CONSOLIDATED', label: 'Consolidated', description: 'All orders grouped for procurement', icon: Package },
  { key: 'PROCUREMENT_IN_PROGRESS', label: 'Procurement', description: 'Items are being sourced', icon: Truck },
  { key: 'ARRIVING_AT_CAMPUS', label: 'Arriving at Campus', description: 'Shipment en route to Caleb University', icon: MapPin },
  { key: 'READY_FOR_DELIVERY', label: 'Ready for Delivery', description: 'Your items are sorted and ready', icon: PackageCheck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', description: 'Rider is on the way to you', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', description: 'Enjoy your purchase!', icon: CheckCircle2 },
] as const;

interface FashionOrderStepperProps {
  currentStatus: string;
  className?: string;
}

export function FashionOrderStepper({ currentStatus, className = '' }: FashionOrderStepperProps) {
  const currentIndex = FASHION_STEPS.findIndex(s => s.key === currentStatus);
  // If status not found, default to first step
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const isDelivered = currentStatus === 'DELIVERED';

  return (
    <div className={`p-6 rounded-[24px] bg-card border border-border shadow-sm ${className}`}>
      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">
        Fashion Order Status
      </h3>

      <div className="space-y-0">
        {FASHION_STEPS.map((step, idx) => {
          const isPast = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isFuture = idx > activeIndex;
          const isLast = idx === FASHION_STEPS.length - 1;
          const Icon = step.icon;

          // Colors
          let circleClasses = '';
          let labelClasses = '';
          let descClasses = 'text-muted-foreground/50';
          let lineClasses = 'bg-muted';

          if (isPast) {
            circleClasses = 'bg-secondary text-white';
            labelClasses = 'text-secondary font-bold';
            descClasses = 'text-muted-foreground';
            lineClasses = 'bg-secondary';
          } else if (isCurrent && isDelivered) {
            circleClasses = 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30';
            labelClasses = 'text-emerald-600 dark:text-emerald-400 font-black';
            descClasses = 'text-emerald-600/70 dark:text-emerald-400/70';
          } else if (isCurrent) {
            circleClasses = 'bg-secondary text-white shadow-lg shadow-secondary/30 ring-4 ring-secondary/20';
            labelClasses = 'text-foreground font-black';
            descClasses = 'text-muted-foreground';
          } else {
            circleClasses = 'bg-muted text-muted-foreground/40';
            labelClasses = 'text-muted-foreground/50';
          }

          return (
            <div key={step.key} className="flex gap-4">
              {/* Left column: circle + connecting line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 flex-shrink-0 ${circleClasses}`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-8 rounded-full mt-1 transition-colors duration-500 ${isPast ? lineClasses : 'bg-muted'}`} />
                )}
              </div>

              {/* Right column: label + description */}
              <div className={`pt-2 ${isLast ? 'pb-0' : 'pb-4'}`}>
                <p className={`text-sm leading-tight ${labelClasses}`}>{step.label}</p>
                {(isPast || isCurrent) && (
                  <p className={`text-xs mt-0.5 ${descClasses}`}>{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
