"use client";

import React from "react";
import { Zap, AlertTriangle } from "lucide-react";

interface EmergencyTransferCardProps {
  onAction: () => void;
}

export default function EmergencyTransferCard({
  onAction,
}: EmergencyTransferCardProps) {
  return (
    <div className="mx-auto mt-8 bg-red-900/10 backdrop-blur-sm border-2 border-red-900/30 rounded-3xl p-8 sm:p-10 mb-8 relative overflow-hidden shadow-2xl">
      {/* Background Gradient Glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-900/10 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header section */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
            <Zap className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Emergency Transfer
            </h2>
            <p className="text-white/50 text-sm sm:text-base leading-relaxed">
              Need to send money urgently? Bypass split allocation for immediate
              delivery.
            </p>
          </div>
        </div>

        {/* Button section */}
        <button
          type="button"
          onClick={onAction}
          className="w-full bg-gradient-to-b from-red-600 to-red-700 hover:brightness-105 text-white py-4 px-6 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]"
        >
          <Zap className="w-5 h-5" />
          <span>Emergency Transfer</span>
        </button>

        {/* Warning section */}
        <div className="bg-black/20 border border-white/[0.08] rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-300 mt-0.5 flex-shrink-0" />
          <p className="text-gray-300 text-sm leading-relaxed">
            Emergency transfers incur a 2% processing fee and bypass your
            automatic split rules.
          </p>
        </div>
      </div>
    </div>
  );
}
