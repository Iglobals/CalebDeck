import React from 'react';
import { Check } from 'lucide-react';

interface ProgressStepperProps {
  steps: string[];
  currentStep: number;
}

export function ProgressStepper({ steps, currentStep }: ProgressStepperProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                index < currentStep
                  ? 'bg-[#7C3AED] text-white'
                  : index === currentStep
                  ? 'bg-[#FCD34D] text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="font-semibold">{index + 1}</span>
              )}
            </div>
            <span
              className={`mt-2 text-xs font-medium text-center ${
                index <= currentStep ? 'text-[#121212]' : 'text-gray-500'
              }`}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 h-0.5 mx-2 mb-6">
              <div
                className={`h-full transition-all duration-300 ${
                  index < currentStep ? 'bg-[#7C3AED]' : 'bg-gray-200'
                }`}
              ></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
