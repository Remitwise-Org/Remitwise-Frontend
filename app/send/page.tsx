"use client";

import { useState } from "react";
import { useToast } from "@/lib/context/ToastContext";
import { useClientTranslator } from "@/lib/i18n/client";
import { apiClient } from "@/lib/client/apiClient";
import { computeAllocation, getSplitConfig } from "@/lib/remittance/split";
import type { SendTransactionResult } from "@/lib/types/api";
import EmergencyTransferModal from "./components/EmergencyTransferModal";
import SendHeader from "./components/SendHeader";
import RecipientAddressInput from "./components/RecipientAddressInput";
import AmountCurrencySection from "./components/AmountCurrencySection";
import ReviewStep from "./components/ReviewStep";
import TransactionSuccessReceipt from "@/components/TransactionSuccessReceipt";
import { useClientLocale } from "@/lib/i18n/client";
import { formatCurrency } from "@/lib/utils/format-currency";

type Step = "recipient" | "amount" | "review";

/** Stellar base reserve fee in the asset being sent (0.00001 XLM equivalent). */
const STELLAR_BASE_FEE = 0.00001;

/**
 * Typed shape matching TransactionSuccessReceiptProps (minus onClose).
 * Built from the /api/send response combined with client-side derived fields.
 */
interface ReceiptData {
  hash: string;
  amount: number;
  currency: string;
  /** Displayed name — falls back to truncated address until a contacts DB exists. */
  recipientName: string;
  recipientAddress: string;
  date: string;
  fee: number;
  splits: {
    spending: number;
    savings: number;
    bills: number;
    insurance: number;
  };
}

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

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [sendAnnouncement, setSendAnnouncement] = useState("");
  const [transactionData, setTransactionData] = useState<ReceiptData | null>(null);

  const { toast } = useToast();
  const { t } = useClientTranslator();

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
   * Response — {@link SendTransactionResult}: `{ success, transactionId }` on 200,
   *            or `{ success: false, error }` on 4xx/5xx.
   *
   * On success:
   *  - Derives split breakdown via `computeAllocation()` (no inline math).
   *  - Populates `transactionData` with the real `transactionId` as the receipt hash.
   *  - Fires a success toast, then shows `TransactionSuccessReceipt`.
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

      // --- Build receipt from real response + derived fields ---
      const splits = computeAllocation(amount, getSplitConfig(recipient));

      const truncate = (addr: string) =>
        addr.length > 12
          ? `${addr.substring(0, 6)}…${addr.substring(addr.length - 6)}`
          : addr;

      const receipt: ReceiptData = {
        hash: data.transactionId,
        amount,
        currency,
        recipientName: truncate(recipient),
        recipientAddress: recipient,
        date: new Date().toLocaleString(),
        fee: STELLAR_BASE_FEE,
        splits,
      };

      setTransactionData(receipt);
      setIsSubmitted(true);
      setSendAnnouncement("Sent");

      toast({
        variant: "success",
        title: t("send.success_title"),
        description: t("send.success_description")
          .replace("{{amount}}", String(amount))
          .replace("{{currency}}", currency)
          .replace("{{address}}", truncate(recipient)),
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

      {isSubmitted && transactionData && (
        <TransactionSuccessReceipt
          {...transactionData}
          onClose={() => setIsSubmitted(false)}
        />
      )}
    </div>
  );
}
