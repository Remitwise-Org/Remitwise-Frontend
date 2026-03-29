import React, { useState } from 'react';
import {
  X,
  Zap,
  Users,
  Clock,
  AlertTriangle,
  ArrowRight,
  DollarSign
} from 'lucide-react';

const EmergencyTransferModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [speed, setSpeed] = useState<'emergency' | 'regular'>('emergency');
  const [amount, setAmount] = useState<number>(0);
  const [agreed, setAgreed] = useState<boolean>(false);

  const priorityFee = speed === 'emergency' ? 2.00 : 0.00;
  const total = amount + priorityFee;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">

      <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-5 sm:p-8 shadow-[0_32px_120px_rgba(0,0,0,0.55)] max-h-[90vh] overflow-y-auto">

        <div className="flex items-start justify-between mb-6 sm:mb-8">
          <div className="flex gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-semibold text-white tracking-tight">Emergency Transfer</h2>
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-red-100 whitespace-nowrap">Priority flow</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-5">
                Highest-priority send. A 2% fee applies and split rules are bypassed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-gray-300 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]"
            aria-label="Close emergency transfer modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="group">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Users className="h-4 w-4 text-red-300" />
              Recipient Name
            </label>
            <input
              type="text"
              placeholder="Enter recipient name"
              className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm sm:text-base"
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              Country
            </label>
            <input
              type="text"
              placeholder="Select country"
              className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm sm:text-base"
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <DollarSign className="h-4 w-4 text-red-300" />
              Amount (USDC)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] py-3 pl-4 pr-20 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-semibold text-sm sm:text-base"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-medium text-gray-400 pointer-events-none">USDC</span>
            </div>
          </div>
        </div>

        <div className="my-6 sm:my-8 rounded-3xl border border-white/[0.08] bg-black/20 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <p className="text-sm font-medium text-gray-300">Transfer summary</p>
            <DollarSign className="h-5 w-5 text-red-300" />
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between text-gray-300">
              <span>Transfer amount</span>
              <span className="font-semibold text-white">
                {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <span>Priority fee</span>
              <span className="font-semibold text-red-100">+{priorityFee.toFixed(2)} USDC</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
              <span className="text-sm font-medium text-gray-300">Total</span>
              <span className="text-2xl font-semibold text-white">
                {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            type="button"
            onClick={() => setSpeed('emergency')}
            className={`rounded-3xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] ${
              speed === 'emergency'
                ? 'border-red-500/20 bg-red-500/10'
                : 'border-white/[0.08] bg-black/20'
            }`}
          >
            <p className="text-sm font-semibold text-white">Emergency</p>
            <p className="mt-2 text-2xl font-semibold text-white">2-5 min</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Highest priority path. Use for urgent household needs only.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSpeed('regular')}
            className={`rounded-3xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] ${
              speed === 'regular'
                ? 'border-white/15 bg-white/[0.05]'
                : 'border-white/[0.08] bg-black/20'
            }`}
          >
            <Clock className="h-5 w-5 text-gray-400 mb-2" />
            <p className="text-sm font-semibold text-white">Regular</p>
            <p className="mt-2 text-2xl font-semibold text-white">30-60 min</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Lower urgency. No priority fee.
            </p>
          </button>
        </div>

        <label className="flex items-start gap-3 mb-6 sm:mb-8 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-500 bg-[#1a1a1a] text-red-600 focus:ring-red-500"
          />
          <span className="leading-6">
            I understand this is an emergency transfer, fees apply, and this action is irreversible.
          </span>
        </label>

        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 flex items-start gap-3 mb-6 sm:mb-8">
          <AlertTriangle className="h-5 w-5 text-red-300 mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed text-gray-300">
            Emergency transfers incur a 2% processing fee and bypass your automatic split rules.
          </p>
        </div>

        <div className="flex gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3 font-semibold text-white transition hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!agreed || amount <= 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-50 text-sm sm:text-base"
          >
            Review Transfer <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyTransferModal;