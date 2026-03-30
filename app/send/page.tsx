"use client";

import { useState } from "react";
import EmergencyTransferModal from "./components/EmergencyTransferModal";
import SendHeader from "./components/SendHeader";
import RecipientAddressInput from "./components/RecipientAddressInput";
import AmountCurrencySection from "./components/AmountCurrencySection";
import AutomaticSplitCard from "./components/AutomaticSplitCard";
import EmergencyTransferCard from "./components/EmergencyTransferCard";
import TransactionSuccessReceipt from "@/components/TransactionSuccessReceipt";

export default function SendMoney() {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [recipientAddress, setRecipientAddress] = useState("");

  const handlePreview = () => {
    // Handle preview transaction
    console.log("Preview transaction clicked");
  };

  const handleSend = (amount: number, currency: string) => {
    // Simulate transaction processing
    const mockData = {
      hash: "GCF27P3Q" + Math.random().toString(36).substring(2, 15).toUpperCase(), // Simulated hash
      amount: amount,
      currency: currency,
      recipientName: "Maria Santos",
      recipientAddress: recipientAddress || "GCF2...7P3Q",
      date: new Date().toLocaleString(),
      fee: 0.0001,
      splits: {
        dailySpending: amount * 0.5,
        savings: amount * 0.3,
        bills: amount * 0.15,
        insurance: amount * 0.05,
      }
    };
    
    setTransactionData(mockData);
    setIsSubmitted(true);
    console.log(`Send ${amount} ${currency} to ${recipientAddress}`);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <SendHeader />

      <main className="mx-auto px-4 sm:px-6 max-w-7xl lg:px-30 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:flex-[2]">
            <RecipientAddressInput onAddressChange={setRecipientAddress} />
            <AmountCurrencySection onSend={handleSend} onPreview={handlePreview} />
            <EmergencyTransferCard
              onAction={() => setShowEmergencyModal(true)}
            />
          </div>
          <div className="lg:flex-[1]">
            <AutomaticSplitCard />
          </div>
        </div>
      </main>

      {isSubmitted && transactionData && (
        <TransactionSuccessReceipt
          {...transactionData}
          onClose={() => setIsSubmitted(false)}
        />
      )}

      <EmergencyTransferModal
        open={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        recipientAddress={recipientAddress}
      />
    </div>
  );
}
