import { Check } from "lucide-react";
import { motion } from "motion/react";

interface Step {
  label: string;
  completed: boolean;
}

interface ProgressStepperProps {
  steps: Step[];
  className?: string;
}

export function ProgressStepper({ steps, className = "" }: ProgressStepperProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <motion.div
              initial={false}
              animate={{
                backgroundColor: step.completed ? "#FF6B35" : "#E5E2DC",
                scale: step.completed ? 1 : 0.9,
              }}
              transition={{ duration: 0.3 }}
              className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
            >
              {step.completed ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <span className="text-sm text-[#9C8F7F]">{index + 1}</span>
              )}
            </motion.div>
            <span className="text-xs text-center text-[#121212]">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <motion.div
              initial={false}
              animate={{
                backgroundColor: step.completed ? "#FF6B35" : "#E5E2DC",
              }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="h-1 flex-1 mx-2 mb-8"
            />
          )}
        </div>
      ))}
    </div>
  );
}
