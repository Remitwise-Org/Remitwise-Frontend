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

export default function SendMoney() {
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
        {/* Progress Indicator */}
        <div className="max-w-xl mx-auto mb-12">
          <div className="flex items-center justify-between relative">
            {/* Background Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -translate-y-1/2 z-0" />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                step === "recipient" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-500"
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
                step === "amount" ? "bg-red-600 text-white" : step === "review" ? "bg-red-900/40 text-red-500" : "bg-zinc-800 text-zinc-500"
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
                step === "review" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-500"
              } ring-4 ring-black`}>
                3
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                step === "review" ? "text-red-500" : "text-zinc-500"
              }`}>Review</span>
            </div>
          </div>
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
