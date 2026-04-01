"use client";

import { useState } from "react";
import {
  AlertCircle,
  Wallet,
  TrendingUp,
  FileText,
  Shield,
  Info,
} from "lucide-react";

interface SplitCategoryProps {
  icon: React.ElementType;
  label: string;
  amount: number;
  percentage: number;
}

const SplitCategory = ({
  icon: Icon,
  label,
  amount,
  percentage,
}: SplitCategoryProps) => {
  const barWidth = `${percentage * 1.4}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-white tabular-nums">
            ${amount.toFixed(2)}
          </span>
          <span className="text-[11px] text-gray-500 w-8 text-right">
            {percentage}%
          </span>
        </div>
      </div>
      <div className="h-[3px] w-full">
        <div
          className="h-full bg-red-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: barWidth }}
        />
      </div>
    </div>
  );
};

interface AutomaticSplitCardProps {
  amount?: number;
}

export default function AutomaticSplitCard({ amount: externalAmount }: AutomaticSplitCardProps) {
  const [internalAmount, setInternalAmount] = useState<string>("");
  
  const total = externalAmount !== undefined ? externalAmount : (parseFloat(internalAmount) || 0);

  const categories = [
    { icon: Wallet, label: "Daily Spending", percentage: 50 },
    { icon: TrendingUp, label: "Savings", percentage: 30 },
    { icon: FileText, label: "Bills", percentage: 15 },
    { icon: Shield, label: "Insurance", percentage: 5 },
  ] as const;

  const displayTotal = total.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-3 max-w-sm mx-auto font-sans">
      {/* Main Split Card */}
      <div className="relative overflow-hidden bg-[#0c0c0c] rounded-3xl p-6 border border-white/5 shadow-2xl">
        {/* Red atmospheric glow — top-right corner */}
        <div className="absolute top-0 right-0 w-[320px] h-[320px] bg-red-900/25 blur-[110px] rounded-full -mr-32 -mt-32 pointer-events-none" />
        {/* Subtle secondary glow — bottom-left */}
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-red-800/10 blur-[90px] rounded-full -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-500/10 p-2 rounded-full shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-white text-xl font-bold tracking-tight">
              Automatic Split
            </h2>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-sm mb-7 leading-relaxed">
            Your remittance will be automatically split according to your
            configured allocation rules:
          </p>

          {/* Categories */}
          <div className="space-y-5">
            {categories.map((cat, index) => (
              <SplitCategory
                key={index}
                icon={cat.icon}
                label={cat.label}
                amount={(total * cat.percentage) / 100}
                percentage={cat.percentage}
              />
            ))}
          </div>

          {/* Divider + Total */}
          <div className="border-t border-white/5 mt-7 pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-bold text-base">
                Total Amount
              </span>
              <span className="text-white text-3xl font-bold tabular-nums leading-none">
                ${displayTotal}
              </span>
            </div>

            {externalAmount === undefined && (
              <input
                type="number"
                value={internalAmount}
                onChange={(e) => setInternalAmount(e.target.value)}
                placeholder="Enter an amount to see split preview"
                min="0"
                step="0.01"
                className="w-full bg-[#161616]/80 backdrop-blur-sm text-white px-4 py-4 rounded-2xl border border-white/5 focus:outline-none focus:ring-1 focus:ring-red-600/30 transition-all placeholder:text-gray-600 text-sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* Stellar Info Card */}
      <div className="relative overflow-hidden bg-[#0c0c0c] rounded-2xl px-4 py-4 border border-white/5">
        {/* Subtle red glow on info card */}
        <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-red-900/15 blur-[70px] rounded-full -mr-10 -mt-10 pointer-events-none" />

        <div className="relative z-10 flex items-start gap-3">
          <div className="bg-red-500/10 p-1.5 rounded-full shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">
            <span className="font-semibold text-gray-200">Fast & Secure:</span>{" "}
            on Stellar network settle in 3-5 seconds with minimal fees.
          </p>
        </div>
      </div>
    </div>
  );
}
