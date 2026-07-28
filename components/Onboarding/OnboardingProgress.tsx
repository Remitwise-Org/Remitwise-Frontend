import { Check } from 'lucide-react';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
}

export default function OnboardingProgress({ currentStep, totalSteps, stepNames }: OnboardingProgressProps) {
  return (
    <div 
      className="w-full max-w-2xl mx-auto mb-10 mt-6"
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
    >
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 rounded-full z-0" aria-hidden="true"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-red rounded-full z-0 transition-all duration-300" 
          style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
          aria-hidden="true"
        ></div>
        
        {stepNames.map((name, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isPending = index > currentStep;
          
          return (
            <div key={name} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${
                  isCompleted 
                    ? 'bg-brand-red text-white' 
                    : isActive 
                      ? 'bg-brand-red text-white ring-4 ring-brand-red/20' 
                      : 'bg-bg2 text-gray-400 border border-white/20'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`text-xs font-medium absolute -bottom-6 w-max text-center ${
                isActive ? 'text-white' : 'text-gray-400'
              }`}>
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
