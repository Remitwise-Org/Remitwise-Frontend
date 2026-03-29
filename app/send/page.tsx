"use client";

import { useState } from "react";
import EmergencyTransferModal from "./components/EmergencyTransferModal";
import SendHeader from "./components/SendHeader";
import RecipientAddressInput from "./components/RecipientAddressInput";
import AmountCurrencySection from "./components/AmountCurrencySection";
import ReviewStep from "./components/ReviewStep";

type Step = "recipient" | "amount" | "review";

export default function SendMoney() {
  const [step, setStep] = useState<Step>("recipient");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("USDC");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

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

  const handleConfirm = () => {
    console.log("Transaction confirmed", { recipient, amount, currency });
    // In a real app, this would trigger the Stellar transaction
    alert("Transaction submitted successfully!");
  };

  return (
    <div className="min-h-screen bg-black text-white">
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
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <EmergencyTransferModal 
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
    </div>
  );
}
