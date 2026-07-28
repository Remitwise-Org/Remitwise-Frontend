"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/lib/context/ToastContext";
import { CTA_TEST_IDS } from "@/lib/cta-testids";
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
  ArrowRight,
  Shield,
} from "lucide-react";
import TransactionSuccessReceipt from "@/components/TransactionSuccessReceipt";
import PageHeadingLink from "@/components/PageHeadingLink";
import { useSeo } from "@/lib/hooks/useSeo";

/**
 * Emergency Transfer – full-page flow.
 *
 * This page is the standalone, self-contained emergency transfer experience.
 * A lighter-weight modal variant lives in:
 *   - components/Dashboard/EmergencyTransferModal.tsx (dashboard quick-action)
 *   - app/send/components/EmergencyTransferModal.tsx (send-flow integration)
 *
 * The modal components share the same fee model ($2.00 priority fee) and
 * irreversibility microcopy but are single-screen forms. This page provides
 * a guided 4-step wizard (recipient → amount → review → confirm) with an
 * explicit double-check confirmation, making it the safer default for users
 * who land here from marketing or deep-links.
 */

type Step = "recipient" | "amount" | "review" | "confirm";

interface ReceiptData {
  hash: string;
  amount: number;
  currency: string;
  recipientName: string;
  recipientAddress: string;
  date: string;
  fee: number;
  speed: "emergency" | "regular";
  splits: {
    spending: number;
    savings: number;
    bills: number;
    insurance: number;
  };
}

const STEP_LABELS: Record<Step, string> = {
  recipient: "Recipient",
  amount: "Amount",
  review: "Review",
  confirm: "Confirm",
};

const STEPS: Step[] = ["recipient", "amount", "review", "confirm"];

export default function EmergencyTransferPage() {
  useSeo({
    title: "Emergency Transfer - RemitWise",
    description:
      "Send instant emergency transfers to your loved ones when they need it most",
  });

  const [step, setStep] = useState<Step>("recipient");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [currency] = useState<string>("USDC");
  const [speed, setSpeed] = useState<"emergency" | "regular">("emergency");
  const [confirmedUrgent, setConfirmedUrgent] = useState(false);
  const [confirmedFee, setConfirmedFee] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [transactionData, setTransactionData] = useState<ReceiptData | null>(
    null,
  );
  const { toast } = useToast();

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);

  const priorityFee = speed === "emergency" ? 2.0 : 0.0;
  const total = amount + priorityFee;
  const validation = useStellarAddressValidation(recipientAddress);

  const activeIndex = STEPS.indexOf(step);

  // Move focus into the new step heading whenever the step changes,
  // so keyboard and screen-reader users land on the new content.
  useEffect(() => {
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step]);

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
    const mockData: ReceiptData = {
      hash:
        "GCF27P3Q" +
        Math.random().toString(36).substring(2, 15).toUpperCase(),
      amount,
      currency,
      recipientName,
      recipientAddress,
      date: new Date().toLocaleString(),
      fee: priorityFee,
      speed,
      splits: {
        spending: amount * 0.5,
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
      description: `Successfully sent ${amount} ${currency} to ${recipientName}. Funds will arrive in ${speed === "emergency" ? "2–5 minutes" : "30–60 minutes"}.`,
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
              <PageHeadingLink
                headingId="emergency-transfer-page-heading"
                label="Emergency Transfer"
                headingClassName="text-2xl font-bold text-(--foreground)"
                buttonClassName="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Emergency Transfer
              </PageHeadingLink>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Screen-reader step announcement */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          Step {activeIndex + 1} of {STEPS.length}: {STEP_LABELS[step]}
        </div>

        {/* Progress Indicator */}
        <nav aria-label="Transfer progress" className="max-w-2xl mx-auto mb-8">
          <ol className="flex items-center justify-between relative list-none p-0 m-0">
            <div
              className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -translate-y-1/2 z-0"
              aria-hidden="true"
            />

            {STEPS.map((s, i) => {
              const isCompleted = i < activeIndex;
              const isCurrent = s === step;
              return (
                <li
                  key={s}
                  className="relative z-10 flex flex-col items-center gap-2"
                >
                  <div
                    aria-current={isCurrent ? "step" : undefined}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                      isCurrent
                        ? "bg-red-600 text-white"
                        : isCompleted
                          ? "bg-red-900/40 text-red-500"
                          : "bg-zinc-800 text-zinc-500"
                    } ${!isCurrent ? "ring-4 ring-black" : ""}`}
                  >
                    {isCompleted ? (
                      <span aria-hidden="true">&#10003;</span>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isCurrent
                        ? "text-red-500"
                        : isCompleted
                          ? "text-red-500/60"
                          : "text-zinc-500"
                    }`}
                  >
                    {STEP_LABELS[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Warning Banner */}
        <div
          role="note"
          className="max-w-2xl mx-auto mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-4"
        >
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" aria-hidden="true" />
            <div className="text-sm leading-relaxed">
              <span className="font-bold text-[#DC2626] block mb-1">
                Good to know before you send
              </span>
              <span className="text-gray-400">
                Emergency transfers are processed immediately and{" "}
                <strong className="text-white">cannot be reversed</strong>.
                A ${priorityFee.toFixed(2)} priority fee applies when you
                choose emergency speed. You can review everything before the
                final submit.
              </span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div
          ref={stepContentRef}
          className="max-w-2xl mx-auto animate-in fade-in duration-500"
          role="group"
          aria-label={`Step ${activeIndex + 1}: ${STEP_LABELS[step]}`}
        >
          {step === "recipient" && (
            <section
              aria-labelledby="step-recipient-heading"
              className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-border"
            >
              <h2
                ref={stepHeadingRef}
                id="step-recipient-heading"
                tabIndex={-1}
                className="text-xl font-bold text-white mb-6 outline-none"
              >
                Who are you sending to?
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="recipient-name"
                    className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"
                  >
                    <Users className="w-4 h-4 text-red-500" aria-hidden="true" />
                    Recipient Name
                  </label>
                  <input
                    id="recipient-name"
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Enter recipient name"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-white placeholder:text-zinc-600 transition-all outline-none focus-visible:border-red-500/50 focus-visible:ring-1 focus-visible:ring-red-500/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="recipient-address"
                    className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"
                  >
                    <Shield className="w-4 h-4 text-red-500" aria-hidden="true" />
                    Wallet Address
                  </label>
                  <input
                    id="recipient-address"
                    type="text"
                    value={recipientAddress}
                    onChange={(e) =>
                      setRecipientAddress(normalizeStellarAddress(e.target.value))
                    }
                    placeholder="GXXXXXXXXXXXXXXXXXXXXXXXX"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-white placeholder:text-zinc-600 transition-all outline-none font-mono focus-visible:border-red-500/50 focus-visible:ring-1 focus-visible:ring-red-500/50"
                  />
                  {recipientAddress && (
                    <p
                      className={`mt-2 text-sm ${
                        validation.tone === "success"
                          ? "text-emerald-400"
                          : validation.tone === "error"
                            ? "text-red-400"
                            : "text-zinc-400"
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
                  className="flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3 font-semibold text-white transition hover:bg-[#202020] text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleRecipientContinue}
                  disabled={!recipientName || !validation.isValid}
                  data-testid={CTA_TEST_IDS.flow.emergencyTransferRecipientPrimary}
                  aria-label="Continue to amount step"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {step === "amount" && (
            <section
              aria-labelledby="step-amount-heading"
              className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-border"
            >
              <h2
                ref={stepHeadingRef}
                id="step-amount-heading"
                tabIndex={-1}
                className="text-xl font-bold text-white mb-6 outline-none"
              >
                How much to send?
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="transfer-amount"
                    className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"
                  >
                    <DollarSign className="w-4 h-4 text-red-500" aria-hidden="true" />
                    Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      id="transfer-amount"
                      type="number"
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 pr-20 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none transition-all font-semibold text-2xl"
                    />
                    <span
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500 pointer-events-none"
                      aria-hidden="true"
                    >
                      USDC
                    </span>
                  </div>
                </div>

                <fieldset className="grid grid-cols-2 gap-3">
                  <legend className="sr-only">Transfer speed</legend>
                  <button
                    type="button"
                    onClick={() => setSpeed("emergency")}
                    aria-pressed={speed === "emergency"}
                    aria-label="Emergency speed: funds arrive in 2 to 5 minutes, plus a 2 dollar priority fee"
                    className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                      speed === "emergency"
                        ? "border-red-600/50 bg-red-600/5 shadow-[0_0_15px_rgba(220,38,38,0.1)]"
                        : "border-zinc-800 bg-zinc-900/20 grayscale opacity-40"
                    }`}
                  >
                    <Zap
                      className="w-5 h-5 text-red-500"
                      fill={speed === "emergency" ? "#ef4444" : "none"}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-bold text-white">
                      Emergency
                    </span>
                    <span className="text-xs text-zinc-500 uppercase font-black">
                      2–5 Minutes · +$2.00 fee
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpeed("regular")}
                    aria-pressed={speed === "regular"}
                    aria-label="Regular speed: funds arrive in 30 to 60 minutes, no extra fee"
                    className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                      speed === "regular"
                        ? "border-zinc-600 bg-zinc-800/20"
                        : "border-zinc-800 bg-zinc-900/20 grayscale opacity-50"
                    }`}
                  >
                    <Clock className="w-5 h-5 text-zinc-400" aria-hidden="true" />
                    <span className="text-sm font-bold text-zinc-200">
                      Regular
                    </span>
                    <span className="text-xs text-zinc-300 uppercase font-black">
                      30–60 Minutes · No extra fee
                    </span>
                  </button>
                </fieldset>

                {amount > 0 && (
                  <div
                    className="rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-4"
                    aria-label="Transfer cost breakdown"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-zinc-500">
                        Transfer Amount
                      </span>
                      <span className="text-sm font-bold text-white">
                        {amount.toLocaleString()} USDC
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-zinc-500">
                        Priority Fee
                      </span>
                      <span className="text-sm font-bold text-red-500">
                        +{priorityFee.toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="flex justify-between items-end border-t border-zinc-800 pt-2">
                      <span className="text-sm font-bold text-zinc-400">
                        Total
                      </span>
                      <span className="text-xl font-bold text-red-500">
                        {total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}{" "}
                        USDC
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep("recipient")}
                  className="flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3 font-semibold text-white transition hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Back
                </button>
                <button
                  onClick={handleAmountReview}
                  disabled={amount <= 0}
                  aria-label="Continue to review step"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Review
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {step === "review" && (
            <section
              aria-labelledby="step-review-heading"
              className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-border"
            >
              <h2
                ref={stepHeadingRef}
                id="step-review-heading"
                tabIndex={-1}
                className="text-xl font-bold text-white mb-6 outline-none"
              >
                Review your transfer
              </h2>

              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Recipient</span>
                    <span className="text-sm font-bold text-white">
                      {recipientName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Address</span>
                    <span className="text-sm font-mono text-white">
                      {recipientAddress.slice(0, 8)}...
                      {recipientAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">
                      Transfer Amount
                    </span>
                    <span className="text-sm font-bold text-white">
                      {amount.toLocaleString()} USDC
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Speed</span>
                    <span className="text-sm font-bold text-white">
                      {speed === "emergency"
                        ? "Emergency (2–5 min)"
                        : "Regular (30–60 min)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">
                      Priority Fee
                    </span>
                    <span className="text-sm font-bold text-red-500">
                      +{priorityFee.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between items-end border-t border-zinc-800 pt-3">
                    <span className="text-sm font-bold text-zinc-400">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-red-500">
                      {total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      USDC
                    </span>
                  </div>
                </div>

                <div
                  role="note"
                  className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4"
                >
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" aria-hidden="true" />
                    <div className="text-sm leading-relaxed">
                      <span className="font-bold text-[#DC2626] block mb-1">
                        Please double-check
                      </span>
                      <span className="text-gray-400">
                        Once submitted, this transfer is final and cannot be
                        reversed. Take a moment to verify the recipient
                        address and amount are correct.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep("amount")}
                  className="flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3 font-semibold text-white transition hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Back
                </button>
                <button
                  onClick={handleReviewConfirm}
                  data-testid={CTA_TEST_IDS.flow.emergencyTransferReviewPrimary}
                  aria-label="Confirm details and proceed to final confirmation"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Confirm Details
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {step === "confirm" && (
            <section
              aria-labelledby="step-confirm-heading"
              className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-border shadow-[0_0_30px_rgba(215,35,35,0.15)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-600 rounded-full">
                  <Zap className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    ref={stepHeadingRef}
                    id="step-confirm-heading"
                    tabIndex={-1}
                    className="text-xl font-bold text-white outline-none"
                  >
                    Final Confirmation
                  </h2>
                  <p className="text-sm text-zinc-400">
                    {speed === "emergency"
                      ? "Emergency transfer — funds arrive in 2–5 minutes"
                      : "Regular transfer — funds arrive in 30–60 minutes"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-zinc-500">Sending to</span>
                    <span className="text-sm font-bold text-white">
                      {recipientName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-zinc-800 pt-2">
                    <span className="text-sm font-bold text-zinc-400">
                      Total Amount
                    </span>
                    <span className="text-2xl font-bold text-red-500">
                      {total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      USDC
                    </span>
                  </div>
                </div>

                <label
                  htmlFor="confirm-urgent"
                  className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-gray-300 cursor-pointer"
                >
                  <input
                    id="confirm-urgent"
                    type="checkbox"
                    checked={confirmedUrgent}
                    onChange={(e) => setConfirmedUrgent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-500 bg-[#1a1a1a] text-red-600 focus:ring-red-500"
                  />
                  <span className="leading-6">
                    I confirm this is an urgent transfer for an emergency
                    situation (medical, family emergency, or time-critical
                    payment).
                  </span>
                </label>

                <label
                  htmlFor="confirm-fee"
                  className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-gray-300 cursor-pointer"
                >
                  <input
                    id="confirm-fee"
                    type="checkbox"
                    checked={confirmedFee}
                    onChange={(e) => setConfirmedFee(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-500 bg-[#1a1a1a] text-red-600 focus:ring-red-500"
                  />
                  <span className="leading-6">
                    I understand the ${priorityFee.toFixed(2)} priority fee
                    will be charged and this transaction cannot be reversed
                    once submitted.
                  </span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep("review")}
                  className="flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3 font-semibold text-white transition hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Back
                </button>
                <button
                  onClick={handleFinalConfirm}
                  disabled={!confirmedUrgent || !confirmedFee}
                  data-testid={CTA_TEST_IDS.flow.emergencyTransferConfirmPrimary}
                  aria-label={
                    !confirmedUrgent || !confirmedFee
                      ? "Please confirm both checkboxes to submit"
                      : `Submit emergency transfer of ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC to ${recipientName}`
                  }
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Submit Transfer
                  <Zap className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
