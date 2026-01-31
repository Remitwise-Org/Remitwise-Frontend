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
    <div className="mx-auto bg-red-900/10 backdrop-blur-sm border-2 border-red-900/30 rounded-3xl p-8 sm:p-10 mb-8 relative overflow-hidden shadow-2xl">
      {/* Background Gradient Glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-900/10 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header section */}
        <div className="flex items-start gap-4">
          <div className="bg-[#2D0A0A] p-3 rounded-2xl flex items-center justify-center text-[#FF3B30] flex-shrink-0">
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
          onClick={onAction}
          className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white py-4 px-6 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Zap className="w-5 h-5" />
          <span>Emergency Transfer</span>
        </button>

        {/* Warning section */}
        <div className="bg-[#1a1111] border border-red-900/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#FF3B30] mt-0.5 flex-shrink-0" />
          <p className="text-white/50 text-sm leading-relaxed">
            Emergency transfers incur a 2% processing fee and bypass your
            automatic split rules.
          </p>
        </div>
      </div>
    </div>
  );
}
