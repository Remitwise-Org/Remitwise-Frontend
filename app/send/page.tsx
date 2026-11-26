"use client";

import { useState } from "react";
import { useToast } from "@/lib/context/ToastContext";
import { useClientTranslator } from "@/lib/i18n/client";
import { apiClient } from "@/lib/client/apiClient";
import type { SendTransactionResult } from "@/lib/types/api";
import EmergencyTransferModal from "./components/EmergencyTransferModal";
import SendHeader from "./components/SendHeader";
import RecipientAddressInput from "./components/RecipientAddressInput";
import AmountCurrencySection from "./components/AmountCurrencySection";
import ReviewStep from "./components/ReviewStep";
import { useClientLocale } from "@/lib/i18n/client";
import { formatCurrency } from "@/lib/utils/format-currency";

type Step = "recipient" | "amount" | "review";

type PreparedPayment = Pick<
  Extract<SendTransactionResult, { success: true }>,
  "xdr" | "networkPassphrase" | "fee"
>;

import { useSeo } from "@/lib/hooks/useSeo";
import Stepper from "@/components/ui/Stepper";

const SEND_STEPS = [
  { id: "recipient", label: "Recipient" },
  { id: "amount", label: "Amount" },
  { id: "review", label: "Review" },
];

export default function SendMoney() {
  useSeo({
    title: "Send Money - RemitWise",
    description: "Fast, secure, and low-cost remittance transfers",
  });

  const [step, setStep] = useState<Step>("recipient");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("USDC");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);
  const [sendAnnouncement, setSendAnnouncement] = useState("");
  const [preparedPayment, setPreparedPayment] = useState<PreparedPayment | null>(null);

  const { toast } = useToast();
  const { t } = useClientTranslator();
  const locale = useClientLocale();

  const handleRecipientContinue = () => {
    if (recipient) {
      setStep("amount");
    }
  };

  const handleAmountReview = (amt: number, curr: string) => {
    setAmount(amt);
    setCurrency(curr);
    setStep("review");
  };

  /**
   * Submits the remittance to POST /api/send.
   *
   * Request  — {@link SendTransactionRequest}: `{ recipient, amount, currency }`
   * Response — {@link SendTransactionResult}: unsigned transaction XDR on 200,
   *            or `{ success: false, error }` on 4xx/5xx.
   *
   * On success, expose the unsigned payload for the user to sign and submit
   * with a compatible Stellar wallet. Building the transaction does not send it.
   *
   * On failure:
   *  - Session expiry  → `apiClient` redirects automatically; we do nothing.
   *  - Network error   → error toast with `send.error_network` key.
   *  - API 4xx/5xx     → error toast with `send.error_title` + server message.
   *
   * The confirm button stays disabled (`isConfirming`) until the promise settles.
   */
  const handleConfirm = async () => {
    // --- Input guards ---
    if (!recipient || recipient.trim() === "") {
      toast({
        variant: "error",
        title: t("send.error_title"),
        description: t("send.error_missing_recipient"),
      });
      return;
    }

    if (!amount || amount <= 0) {
      toast({
        variant: "error",
        title: t("send.error_title"),
        description: t("send.error_empty_amount"),
      });
      return;
    }

    setSendAnnouncement("Sending…");
    setIsConfirming(true);

    try {
      // --- Call /api/send ---
      const response = await apiClient.post("/api/send", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, amount, currency }),
      });

      // null → session expired; apiClient already triggered redirect
      if (response === null) return;

      const data: SendTransactionResult = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = !data.success ? data.error : t("send.error_api");
        toast({
          variant: "error",
          title: t("send.error_title"),
          description: errorMsg,
        });
        return;
      }

      setPreparedPayment({
        xdr: data.xdr,
        networkPassphrase: data.networkPassphrase,
        fee: data.fee,
      });
      setSendAnnouncement("Unsigned transaction ready to sign");
      toast({
        variant: "info",
        title: "Transaction ready to sign",
        description: "Copy the unsigned transaction XDR into a compatible Stellar wallet to sign and submit it.",
      });
    } catch {
      // Network-level failure (fetch rejected)
      toast({
        variant: "error",
        title: t("send.error_title"),
        description: t("send.error_network"),
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {sendAnnouncement}
      </div>

      {/* Header */}
      <SendHeader />

      <main className="mx-auto px-4 sm:px-6 max-w-7xl lg:px-8 py-12">
        {/* Step progress indicator */}
        <div className="mx-auto mb-12 max-w-xl">
          <Stepper
            steps={SEND_STEPS}
            currentStep={step}
            onStepClick={(id) => {
              // Only allow navigating back to a previous step
              const target = id as Step;
              const currentIndex = SEND_STEPS.findIndex((s) => s.id === step);
              const targetIndex = SEND_STEPS.findIndex((s) => s.id === target);
              if (targetIndex < currentIndex) {
                setStep(target);
              }
            }}
          />
        </div>

        {/* Step Content */}
        <div className="animate-in fade-in duration-500">
          {step === "recipient" && (
            <div className="max-w-2xl mx-auto">
              <RecipientAddressInput
                initialAddress={recipient}
                onAddressChange={setRecipient}
                onContinue={handleRecipientContinue}
              />
            </div>
          )}

          {step === "amount" && (
            <div className="max-w-2xl mx-auto">
              <AmountCurrencySection
                onReview={handleAmountReview}
                onBack={() => setStep("recipient")}
              />
            </div>
          )}

          {step === "review" && (
            <ReviewStep
              recipient={recipient}
              amount={amount}
              currency={currency}
              onConfirm={handleConfirm}
              onBack={() => setStep("amount")}
              onEmergencyAction={() => setShowEmergencyModal(true)}
              isPending={isConfirming}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <EmergencyTransferModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />

      {preparedPayment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="prepared-payment-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <section className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0A0A0A] p-6 text-white">
            <h2 id="prepared-payment-title" className="text-xl font-semibold">
              Unsigned transaction ready to sign
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              This payment has not been submitted. Copy the XDR into a compatible Stellar wallet to review, sign, and submit it.
            </p>
            <p className="mt-3 text-sm text-gray-300">
              Network fee:{" "}
              {formatCurrency(
                Number(preparedPayment.fee) / 10_000_000,
                "XLM",
                locale,
                { minimumFractionDigits: 0, maximumFractionDigits: 7 },
              )}
            </p>
            <p className="mt-1 break-all text-xs text-gray-500">
              Network: {preparedPayment.networkPassphrase}
            </p>
            <textarea
              aria-label="Unsigned transaction XDR"
              readOnly
              value={preparedPayment.xdr}
              className="mt-4 h-32 w-full resize-y rounded-lg border border-white/10 bg-black p-3 font-mono text-xs text-gray-300"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreparedPayment(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(preparedPayment.xdr);
                    toast({ variant: "success", title: "Transaction XDR copied" });
                  } catch {
                    toast({
                      variant: "error",
                      title: t("send.error_title"),
                      description: "Unable to copy the transaction XDR.",
                    });
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Copy XDR
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
