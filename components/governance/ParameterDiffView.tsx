'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { SplitPercentages } from '@/lib/validation/percentages';
import type { ParameterChange } from '@/lib/governance/types';

interface ParameterDiffViewProps {
  currentParameters: SplitPercentages;
  proposedParameters: SplitPercentages;
  className?: string;
}

const PARAMETER_LABELS: Record<keyof SplitPercentages, string> = {
  spending: 'Spending',
  savings: 'Savings',
  bills: 'Bills',
  insurance: 'Insurance',
};

const PARAMETER_COLORS: Record<keyof SplitPercentages, string> = {
  spending: 'bg-blue-500',
  savings: 'bg-green-500',
  bills: 'bg-yellow-500',
  insurance: 'bg-purple-500',
};

function formatNumber(value: number): string {
  return value.toFixed(1);
}

function formatChange(change: number, changePercent: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${formatNumber(change)} (${sign}${changePercent.toFixed(1)}%)`;
}

function ChangeIndicator({ change }: { change: number }) {
  if (Math.abs(change) < 0.01) {
    return <Minus className="h-4 w-4 text-gray-400" />;
  }
  
  if (change > 0) {
    return <ArrowUp className="h-4 w-4 text-green-500" />;
  }
  
  return <ArrowDown className="h-4 w-4 text-red-500" />;
}

function ChangeBadge({ change, changePercent }: { change: number; changePercent: number }) {
  if (Math.abs(change) < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-400">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }
  
  const isIncrease = change > 0;
  const bgColor = isIncrease ? 'bg-green-900/30' : 'bg-red-900/30';
  const textColor = isIncrease ? 'text-green-400' : 'text-red-400';
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${bgColor} px-2 py-1 text-xs ${textColor}`}>
      {isIncrease ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {formatChange(change, changePercent)}
    </span>
  );
}

export default function ParameterDiffView({
  currentParameters,
  proposedParameters,
  className = '',
}: ParameterDiffViewProps) {
  const keys: (keyof SplitPercentages)[] = ['spending', 'savings', 'bills', 'insurance'];
  
  const changes = keys.map((key) => {
    const currentValue = currentParameters[key];
    const proposedValue = proposedParameters[key];
    const change = proposedValue - currentValue;
    const changePercent = currentValue !== 0 ? (change / currentValue) * 100 : 0;
    
    return {
      key,
      currentValue,
      proposedValue,
      change,
      changePercent,
    };
  });

  const hasAnyChanges = changes.some((c) => Math.abs(c.change) > 0.01);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/90">Parameter Changes</h3>
        {!hasAnyChanges && (
          <span className="text-xs text-gray-400">No changes proposed</span>
        )}
      </div>

      <div className="space-y-3">
        {changes.map((change) => (
          <div
            key={change.key}
            className="rounded-lg border border-white/10 bg-black/40 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${PARAMETER_COLORS[change.key]}`} />
                <span className="text-sm font-medium text-white/90">
                  {PARAMETER_LABELS[change.key]}
                </span>
              </div>
              <ChangeBadge change={change.change} changePercent={change.changePercent} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-gray-400">Current</span>
                <div className="text-lg font-semibold text-white/80">
                  {formatNumber(change.currentValue)}%
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400">Proposed</span>
                <div className="text-lg font-semibold text-white">
                  {formatNumber(change.proposedValue)}%
                </div>
              </div>
            </div>

            {Math.abs(change.change) >= 0.01 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Change</span>
                  <span className={change.change > 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatChange(change.change, change.changePercent)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      change.change > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(Math.abs(change.changePercent), 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasAnyChanges && (
        <div className="rounded-lg border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
          <div className="text-xs text-gray-400 mb-2">Summary</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Total parameters changed</span>
            <span className="text-sm font-semibold text-white">
              {changes.filter((c) => Math.abs(c.change) >= 0.01).length} / {changes.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
