"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/lib/context/ToastContext";
import useStellarAddressValidation, {
  normalizeStellarAddress,
} from "@/lib/hooks/useStellarAddressValidation";
import {
  ArrowLeft,
  AlertTriangle,
  Zap,
  Users,
  Clock,
  DollarSign,
  Check,
  ArrowRight,
  Shield,
} from "lucide-react";
import TransactionSuccessReceipt from "@/components/TransactionSuccessReceipt";

type Step = "recipient" | "amount" | "review" | "confirm";

export default function EmergencyTransferPage() {
  const [step, setStep] = useState<Step>("recipient");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("USDC");
  const [speed, setSpeed] = useState<"emergency" | "regular">("emergency");
  const [confirmedUrgent, setConfirmedUrgent] = useState(false);
  const [confirmedFee, setConfirmedFee] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const { toast } = useToast();

  const priorityFee = speed === "emergency" ? 2.0 : 0.0;
  const total = amount + priorityFee;
  const validation = useStellarAddressValidation(recipientAddress);

  const handleRecipientContinue = () => {
    if (recipientName && validation.isValid) {
      setStep("amount");
    }
  };

  const handleAmountReview = () => {
    if (amount > 0) {
      setStep("review");
    }
  };

  const handleReviewConfirm = () => {
    setStep("confirm");
  };

  const handleFinalConfirm = () => {
    const mockData = {
      hash: "GCF27P3Q" + Math.random().toString(36).substring(2, 15).toUpperCase(),
      amount: amount,
      currency: currency,
      recipientName: recipientName,
      recipientAddress: recipientAddress,
      date: new Date().toLocaleString(),
      fee: priorityFee,
      speed: speed,
      splits: {
        dailySpending: amount * 0.5,
        savings: amount * 0.3,
        bills: amount * 0.15,
        insurance: amount * 0.05,
      },
    };

    setTransactionData(mockData);
    setIsSubmitted(true);
    toast({
      variant: "success",
      title: "Emergency transfer submitted",
      description: `Successfully sent ${amount} ${currency} to ${recipientName}. Funds will arrive in ${speed === "emergency" ? "2-5 minutes" : "30-60 minutes"}.`,
    });
  };

  if (isSubmitted && transactionData) {
    return (
      <TransactionSuccessReceipt
        {...transactionData}
        onClose={() => setIsSubmitted(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Header */}
      <header className="bg-(--background) shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-(--foreground) hover:text-(--foreground)"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-red rounded-full shadow-[0_0_20px_rgba(215,35,35,0.4)]">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-(--foreground)">
                Emergency Transfer
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -translate-y-1/2 z-0" />
            
            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                step === "recipient" ? "bg-red-600 text-white" : step !== "recipient" ? "bg-red-900/40 text-red-500" : "bg-zinc-800 text-zinc-500"
              } ${step !== "recipient" ? "ring-4 ring-black" : ""}`}>
                1
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                step === "recipient" ? "text-red-500" : "text-zinc-500"
              }`}>Recipient</span>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                step === "amount" ? "bg-red-600 text-white" : step === "review" || step === "confirm" ? "bg-red-900/40 text-red-500" : "bg-zinc-800 text-zinc-500"
              } ring-4 ring-black`}>
                2
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                step === "amount" ? "text-red-500" : "text-zinc-500"
              }`}>Amount</span>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                step === "review" ? "bg-red-600 text-white" : step === "confirm" ? "bg-red-900/40 text-red-500" : "bg-zinc-800 text-zinc-500"
              } ring-4 ring-black`}>
                3
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                step === "review" ? "text-red-500" : "text-zinc-500"
              }`}>Review</span>
            </div>

            {/* Step 4 */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                step === "confirm" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-500"
              } ring-4 ring-black`}>
                4
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                step === "confirm" ? "text-red-500" : "text-zinc-500"
              }`}>Confirm</span>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="max-w-2xl mx-auto mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <div className="text-sm leading-relaxed">
              <span className="font-bold text-[#DC2626] block mb-1">
                Emergency Transfer Warning
              </span>
              <span className="text-gray-400">
                Emergency transfers are processed immediately and{" "}
                <strong className="text-white">cannot be reversed</strong>.
                A ${priorityFee.toFixed(2)} priority fee applies. Only use this for urgent situations.
              </span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
          {step === "recipient" && (
            <div className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-border shadow-[0_0_30px_rgba(215,35,35,0.15)]">
              <h2 className="text-xl font-bold text-white mb-6">Who are you sending to?</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2">
                    <Users className="w-4 h-4 text-red-500" />
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Enter recipient name"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2">
                    <Shield className="w-4 h-4 text-red-500" />
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(normalizeStellarAddress(e.target.value))}
                    placeholder="GXXXXXXXXXXXXXXXXXXXXXXXX"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none transition-all font-mono"
                  />
                  {recipientAddress && (
                    <p
                      className={`mt-2 text-sm ${
                        validation.tone === 'success'
                          ? 'text-emerald-400'
                          : validation.tone === 'error'
                            ? 'text-red-400'
                            : 'text-zinc-400'
                      }`}
                      aria-live="polite"
                    >
                      {validation.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Link
                  href="/dashboard"
                  className="flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3 font-semibold text-white transition hover:bg-[#202020] text-center"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleRecipientContinue}
                  disabled={!recipientName || !validation.isValid}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === "amount" && (
            <div className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-border shadow-[0_0_30px_rgba(215,35,35,0.15)]">
              <h2 className="text-xl font-bold text-white mb-6">How much to send?</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2">
                    <DollarSign className="w-4 h-4 text-red-500" />
                    Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 pr-20 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none transition-all font-semibold text-2xl"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500 pointer-events-none">
                      USDC
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSpeed("emergency")}
                    className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 transition-all ${
                      speed === "emergency"
                        ? "border-red-600/50 bg-red-600/5 shadow-[0_0_15px_rgba(220,38,38,0.1)]"
                        : "border-zinc-800 bg-zinc-900/20 grayscale opacity-40"
                    }`}
                  >
                    <Zap
                      className="w-5 h-5 text-red-500"
                      fill={speed === "emergency" ? "#ef4444" : "none"}
                    />
                    <span className="text-sm font-bold text-white">Emergency</span>
                    <span className="text-xs text-zinc-500 uppercase font-black">
                      2–5 Minutes · +$2.00 fee
                    </span>
                  </button>

                  <button
                    onClick={() => setSpeed("regular")}
                    className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 transition-all ${
                      speed === "regular"
                        ? "border-zinc-600 bg-zinc-800/20"
                        : "border-zinc-800 bg-zinc-900/20 grayscale opacity-50"
                    }`}
                  >
                    <Clock className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm font-bold text-zinc-200">Regular</span>
                    <span className="text-xs text-zinc-300 uppercase font-black">
                      30–60 Minutes · No extra fee
                    </span>
                  </button>
                </div>

                {amount > 0 && (
                  <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-zinc-500">Transfer Amount</span>
                      <span className="text-sm font-bold text-white">
                        {amount.toLocaleString()} USDC
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-zinc-500">Priority Fee</span>
                      <span className="text-sm font-bold text-red-500">
                        +{priorityFee.toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="flex justify-between items-end border-t border-zinc-800 pt-2">
                      <span className="text-sm font-bold text-zinc-400">Total</span>
                      <span className="text-xl font-bold text-red-500">
                        {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                        USDC
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep("recipient")}
                  className="flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3 font-semibold text-white transition hover:bg-[#202020]"
                >
                  Back
                </button>
                <button
                  onClick={handleAmountReview}
                  disabled={amount <= 0}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Review
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-border shadow-[0_0_30px_rgba(215,35,35,0.15)]">
              <h2 className="text-xl font-bold text-white mb-6">Review your transfer</h2>
              
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Recipient</span>
                    <span className="text-sm font-bold text-white">{recipientName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Address</span>
                    <span className="text-sm font-mono text-white">
                      {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Transfer Amount</span>
                    <span className="text-sm font-bold text-white">
                      {amount.toLocaleString()} USDC
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Speed</span>
                    <span className="text-sm font-bold text-white">
                      {speed === "emergency" ? "Emergency (2-5 min)" : "Regular (30-60 min)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Priority Fee</span>
                    <span className="text-sm font-bold text-red-500">
                      +{priorityFee.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between items-end border-t border-zinc-800 pt-3">
                    <span className="text-sm font-bold text-zinc-400">Total</span>
                    <span className="text-2xl font-bold text-red-500">
                      {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                      USDC
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                    <div className="text-sm leading-relaxed">
                      <span className="font-bold text-[#DC2626] block mb-1">
                        Final Confirmation Required
                      </span>
                      <span className="text-gray-400">
                        This transfer cannot be reversed once submitted. Please verify all details are correct.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep("amount")}
                  className="flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3 font-semibold text-white transition hover:bg-[#202020]"
                >
                  Back
                </button>
                <button
                  onClick={handleReviewConfirm}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition"
                >
                  Confirm Details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-border shadow-[0_0_30px_rgba(215,35,35,0.15)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-600 rounded-full">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Final Confirmation</h2>
                  <p className="text-sm text-zinc-400">
                    {speed === "emergency" ? "Emergency transfer - funds arrive in 2-5 minutes" : "Regular transfer - funds arrive in 30-60 minutes"}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-zinc-500">Sending to</span>
                    <span className="text-sm font-bold text-white">{recipientName}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-zinc-800 pt-2">
                    <span className="text-sm font-bold text-zinc-400">Total Amount</span>
                    <span className="text-2xl font-bold text-red-500">
                      {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                      USDC
                    </span>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedUrgent}
                    onChange={(e) => setConfirmedUrgent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-500 bg-[#1a1a1a] text-red-600 focus:ring-red-500"
                  />
                  <span className="leading-6">
                    I confirm this is an urgent transfer for an emergency situation (medical, family emergency, or time-critical payment).
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedFee}
                    onChange={(e) => setConfirmedFee(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-500 bg-[#1a1a1a] text-red-600 focus:ring-red-500"
                  />
                  <span className="leading-6">
                    I understand the ${priorityFee.toFixed(2)} priority fee will be charged and this transaction cannot be reversed once submitted.
                  </span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep("review")}
                  className="flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3 font-semibold text-white transition hover:bg-[#202020]"
                >
                  Back
                </button>
                <button
                  onClick={handleFinalConfirm}
                  disabled={!confirmedUrgent || !confirmedFee}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit Transfer
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
