import { useState } from 'react';
import { Layers3 } from 'lucide-react';
import { DEFAULT_SPLIT_CONFIG, type SplitConfig } from '@/lib/remittance/split';

interface StepSplitProps {
  onNext: () => void;
  onBack: () => void;
}

export default function StepSplit({ onNext, onBack }: StepSplitProps) {
  const [allocation, setAllocation] = useState<SplitConfig>(DEFAULT_SPLIT_CONFIG);

  const total = allocation.spending + allocation.savings + allocation.bills + allocation.insurance;
  const isValid = total === 100;

  const handleChange = (key: keyof SplitConfig, value: number) => {
    setAllocation(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-3 mb-4">
        <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Layers3 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl 375:text-3xl font-bold text-white">
          Configure Your First Split
        </h2>
        <p className="text-gray-300 text-sm 375:text-base">
          How would you like to automatically divide incoming remittances? You can always change this later.
        </p>
      </div>

      <div className="bg-bg2 border border-white/10 rounded-2xl p-4 375:p-6 space-y-5">
        <SplitInput 
          label="Spending" 
          value={allocation.spending} 
          color="bg-blue-500" 
          onChange={(v) => handleChange("spending", v)} 
        />
        <SplitInput 
          label="Savings" 
          value={allocation.savings} 
          color="bg-green-500" 
          onChange={(v) => handleChange("savings", v)} 
        />
        <SplitInput 
          label="Bills & Insurance" 
          value={allocation.bills} 
          color="bg-yellow-500" 
          onChange={(v) => handleChange("bills", v)} 
        />
        {/* Simplified for onboarding: combined bills and insurance or just keep them separate but simple */}

        <div className={`mt-6 p-4 rounded-xl border ${isValid ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'} flex justify-between items-center`}>
          <span className="text-sm font-medium text-gray-300">Total Allocation</span>
          <span className={`text-xl font-bold ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>{total}%</span>
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
          disabled={!isValid}
          className="touch-target-wide flex-[2] bg-brand-red hover:bg-red-700 text-white rounded-xl py-3.5 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 focus:ring-offset-bg1"
        >
          Confirm Split
        </button>
      </div>
    </div>
  );
}

function SplitInput({
	label,
	value,
	color,
	onChange,
}: {
	label: string;
	value: number;
	color: string;
	onChange: (value: number) => void;
}) {
	return (
		<div>
			<div className='mb-2 flex items-center justify-between'>
				<label className='text-sm font-medium text-white'>{label}</label>
				<span className='text-sm font-semibold text-white'>{value}%</span>
			</div>
			<input
				type='range'
				min='0'
				max='100'
				step='1'
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className='h-2 w-full accent-brand-red bg-white/10 rounded-lg appearance-none cursor-pointer'
				aria-label={`${label} percentage`}
			/>
      <div className='mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden' aria-hidden='true'>
				<div
					className={`${color} h-full transition-all duration-150`}
					style={{ width: `${value}%` }}
				/>
			</div>
		</div>
	);
}
