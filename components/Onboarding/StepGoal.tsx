import { useState } from 'react';
import { Target } from 'lucide-react';

interface StepGoalProps {
  onNext: () => void;
  onBack: () => void;
}

export default function StepGoal({ onNext, onBack }: StepGoalProps) {
  const [goalName, setGoalName] = useState('Emergency Fund');
  const [targetAmount, setTargetAmount] = useState('1000');

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-3 mb-4">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8" />
        </div>
        <h2 className="text-2xl 375:text-3xl font-bold text-white">
          Set Your First Goal
        </h2>
        <p className="text-gray-300 text-sm 375:text-base">
          What are you saving for? We&apos;ll automatically route your savings split here.
        </p>
      </div>

      <div className="bg-bg2 border border-white/10 rounded-2xl p-4 375:p-6 space-y-5 text-left">
        <div className="space-y-2">
          <label htmlFor="goal-name" className="block text-sm font-medium text-white">Goal Name</label>
          <input 
            id="goal-name"
            type="text" 
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder="e.g. Education, Emergency Fund"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-red placeholder-gray-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="target-amount" className="block text-sm font-medium text-white">Target Amount (USDC)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input 
              id="target-amount"
              type="number" 
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="1000"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-red placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={onBack}
          className="touch-target-wide flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl py-3.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-bg1"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!goalName || !targetAmount}
          className="touch-target-wide flex-[2] bg-brand-red hover:bg-red-700 text-white rounded-xl py-3.5 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 focus:ring-offset-bg1"
        >
          Create Goal
        </button>
      </div>
    </div>
  );
}
