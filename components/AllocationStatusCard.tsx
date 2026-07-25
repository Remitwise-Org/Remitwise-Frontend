"use client";

import React from "react";
import { CircleCheckBig } from 'lucide-react';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

interface AllocationStatusProps {
  percentage: number;
}

export default function AllocationStatusCard({
  percentage = 100,
}: AllocationStatusProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isComplete = percentage === 100;

  const cardShadow = isComplete
    ? "shadow-[0_0_25px_rgba(215,35,35,0.2)] border-brand-red/20"
    : "border-white/5";
  const textColor = isComplete ? "text-brand-red" : "text-zinc-400";
  const barColor = isComplete
    ? `bg-brand-red shadow-[0_0_12px_rgba(215,35,35,0.6)] ${prefersReducedMotion ? '' : 'animate-neon-pulse'}`
    : "bg-zinc-700";

  return (
    <div className="w-full max-w-3xl px-4">
      <div
        className={`relative bg-[#1f1717] border rounded-2xl p-8 transition-all duration-500 ${cardShadow}`}
      >
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-1">
            <h3 className="text-white font-bold text-xl tracking-tight">
              Total Allocation
            </h3>
            <p className="text-zinc-500 text-sm font-medium">
              {isComplete
                ? "Perfect! Your allocation is complete."
                : "Your allocation is still in progress."}
            </p>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-3">
              <span
                className={`text-4xl font-black tracking-tighter transition-colors tabular-nums ${textColor}`}
              >
                {percentage}%
              </span>

              {isComplete && (
                <div className="relative flex items-center justify-center">
                  <div
                    className={`absolute inset-0 blur-xl opacity-20 ${prefersReducedMotion ? '' : 'animate-neon-pulse'}`}
                  />
                  <div className="relative bg-[#5c2828] p-2 rounded-full">
                    <CircleCheckBig
                      className="w-6 h-6 text-brand-red"
                      strokeWidth={3}
                    />
                  </div>
                </div>
              )}
            </div>
            <span className="text-[12px] text-zinc-600 font-bold mt-1 mr-1">
              of 100%
            </span>
          </div>
        </div>

        <div className="relative w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-in-out ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}