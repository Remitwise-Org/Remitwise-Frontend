"use client";

import React from "react";
import { ArrowRight, AlertTriangle, ShieldAlert, Zap } from "lucide-react";
import {
  EMERGENCY_TRANSFER_BADGE,
  EMERGENCY_TRANSFER_DESCRIPTION,
  EMERGENCY_TRANSFER_FEE_PERCENT,
  EMERGENCY_TRANSFER_IMPACTS,
  EMERGENCY_TRANSFER_TITLE,
  EMERGENCY_TRANSFER_WARNING,
} from "./emergencyTransferContent";

interface EmergencyTransferCardProps {
  onAction: () => void;
}

export default function EmergencyTransferCard({
  onAction,
}: EmergencyTransferCardProps) {
  return (
    <section className="relative mx-auto mb-8 mt-8 overflow-hidden rounded-3xl border border-red-500/20 bg-[linear-gradient(180deg,rgba(36,11,11,0.92),rgba(13,13,13,0.98))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)] sm:p-8">
      <div className="absolute right-0 top-0 h-[280px] w-[280px] rounded-full bg-red-700/20 blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-100">
              <Zap className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {EMERGENCY_TRANSFER_TITLE}
                </h2>
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-red-100">
                  {EMERGENCY_TRANSFER_BADGE}
                </span>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
                {EMERGENCY_TRANSFER_DESCRIPTION}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300">
            <ShieldAlert className="h-4 w-4 text-red-200" />
            <span>{EMERGENCY_TRANSFER_FEE_PERCENT}% priority fee</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {EMERGENCY_TRANSFER_IMPACTS.map((impact) => (
            <div
              key={impact.label}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                {impact.label}
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-white">
                {impact.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
            <p className="text-sm leading-6 text-red-50/90">
              {EMERGENCY_TRANSFER_WARNING}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAction}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-4 font-semibold text-white shadow-[0_16px_36px_rgba(185,28,28,0.28)] transition hover:from-red-500 hover:to-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#140808] active:scale-[0.99]"
        >
          <span>Review emergency transfer</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
