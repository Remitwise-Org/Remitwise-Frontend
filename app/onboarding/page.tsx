'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

import OnboardingProgress from '@/components/Onboarding/OnboardingProgress';
import StepWallet from '@/components/Onboarding/StepWallet';
import StepSplit from '@/components/Onboarding/StepSplit';
import StepGoal from '@/components/Onboarding/StepGoal';
import StepComplete from '@/components/Onboarding/StepComplete';
import { useSeo } from '@/lib/hooks/useSeo';

const STEPS = ['Connect Wallet', 'Smart Split', 'First Goal'];

export default function OnboardingPage() {
  useSeo({
    title: 'Welcome to RemitWise - Onboarding',
    description: 'Set up your RemitWise account for smart remittances.',
  });

  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const stepContainerRef = useRef<HTMLDivElement>(null);

  // Focus management: when step changes, focus the container so screen readers announce it
  useEffect(() => {
    if (stepContainerRef.current) {
      stepContainerRef.current.focus();
    }
  }, [currentStep]);

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    // In a real app, this might save "skipped" state to the backend
    router.push('/dashboard');
  };

  const isCompleted = currentStep === STEPS.length;

  return (
    <div className="min-h-screen bg-bg1 flex flex-col">
      <header className="w-full p-4 flex justify-end">
        {!isCompleted && (
          <button
            onClick={handleSkip}
            className="touch-target flex items-center gap-2 text-gray-400 hover:text-white transition-colors p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-bg1"
            aria-label="Skip onboarding for now"
          >
            <span className="text-sm font-medium">Skip for now</span>
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col justify-center px-4 sm:px-6 pb-20">
        {!isCompleted && (
          <OnboardingProgress 
            currentStep={currentStep} 
            totalSteps={STEPS.length} 
            stepNames={STEPS}
          />
        )}

        <div 
          ref={stepContainerRef}
          tabIndex={-1}
          className="w-full outline-none"
          aria-live="polite"
        >
          {currentStep === 0 && <StepWallet onNext={handleNext} />}
          {currentStep === 1 && <StepSplit onNext={handleNext} onBack={handleBack} />}
          {currentStep === 2 && <StepGoal onNext={handleNext} onBack={handleBack} />}
          {currentStep === 3 && <StepComplete />}
        </div>
      </main>
    </div>
  );
}
