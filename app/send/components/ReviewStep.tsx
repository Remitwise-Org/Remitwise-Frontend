"use client";

import { Zap, ArrowLeft, ShieldCheck, User, CreditCard } from "lucide-react";
import AutomaticSplitCard from "./AutomaticSplitCard";

interface ReviewStepProps {
  recipient: string;
  amount: number;
  currency: string;
  onConfirm: () => void;
  onBack: () => void;
  onEmergencyAction: () => void;
}

export default function ReviewStep({
  recipient,
  amount,
  currency,
  onConfirm,
  onBack,
  onEmergencyAction,
}: ReviewStepProps) {
  return (
    <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:flex-[1.5] space-y-6">
          <div className="bg-[#0c0c0c] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
             {/* Subtle Gradient Glow */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-900/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />

            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-red-500" />
              Review Transaction
            </h2>

            <div className="space-y-6">
              {/* Recipient Summary */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="bg-red-500/10 p-3 rounded-xl">
                  <User className="w-5 h-5 text-red-500" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Recipient</p>
                  <p className="text-white font-mono text-sm break-all">{recipient}</p>
                </div>
              </div>

              {/* Amount Summary */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="bg-red-500/10 p-3 rounded-xl">
                  <CreditCard className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Amount to Send</p>
                  <p className="text-3xl font-bold text-white">
                    {amount.toLocaleString()} <span className="text-red-500">{currency}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <button
                onClick={onConfirm}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-lg font-bold transition-all transform active:scale-[0.98] shadow-lg shadow-red-900/40 flex items-center justify-center gap-3"
              >
                <Zap className="w-5 h-5 fill-current" />
                Confirm & Send Remittance
              </button>

              <button
                onClick={onBack}
                className="w-full py-4 bg-transparent hover:bg-white/5 text-zinc-400 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Amount
              </button>
            </div>
          </div>

          {/* Emergency Option */}
          <div className="bg-red-900/5 border border-red-900/20 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="bg-red-900/20 p-2 rounded-lg mt-1">
                <Zap className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h4 className="text-white font-bold mb-1">Need it faster?</h4>
                <p className="text-zinc-500 text-sm mb-4">
                  Bypass split rules for immediate delivery. 2% fee applies.
                </p>
                <button 
                  onClick={onEmergencyAction}
                  className="text-red-500 text-sm font-bold hover:text-red-400 transition-colors"
                >
                  Switch to Emergency Transfer →
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:flex-[1]">
          <AutomaticSplitCard amount={amount} />
        </div>
      </div>
    </div>
  );
}
