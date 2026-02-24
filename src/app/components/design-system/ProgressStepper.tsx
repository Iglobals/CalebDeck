import React from 'react';
import { Check } from 'lucide-react';

interface ProgressStepperProps {
  steps: string[];
  currentStep: number;
}

export function ProgressStepper({ steps, currentStep }: ProgressStepperProps) {
  const isComplete = currentStep === steps.length - 1;

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const isLastStep = index === steps.length - 1;
        const isPast = index < currentStep;
        const isCurrent = index === currentStep;

        let circleClass = 'bg-gray-200 text-gray-500';
        if (isPast) {
          circleClass = 'bg-[#7C3AED] text-white';
        } else if (isCurrent && isLastStep) {
          // DELIVERED — green
          circleClass = 'bg-[#10B981] text-white shadow-lg shadow-[#10B981]/30';
        } else if (isCurrent) {
          // In progress — gold
          circleClass = 'bg-[#FCD34D] text-white';
        }

        let labelClass = 'text-gray-500';
        if (isCurrent && isLastStep) {
          labelClass = 'text-[#10B981] font-bold';
        } else if (index <= currentStep) {
          labelClass = 'text-[#121212]';
        }

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${circleClass}`}>
                {isPast || (isCurrent && isLastStep) ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </div>
              <span className={`mt-2 text-xs font-medium text-center ${labelClass}`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-6">
                <div
                  className={`h-full transition-all duration-500 ${isPast ? 'bg-[#7C3AED]' :
                      isCurrent && index === steps.length - 2 && isComplete ? 'bg-[#10B981]' :
                        'bg-gray-200'
                    }`}
                ></div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
