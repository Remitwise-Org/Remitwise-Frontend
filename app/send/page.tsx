"use client";

import { useState } from "react";
import EmergencyTransferModal from "./components/EmergencyTransferModal";
import SendHeader from "./components/SendHeader";
import RecipientAddressInput from "./components/RecipientAddressInput";
import AmountCurrencySection from "./components/AmountCurrencySection";
import AutomaticSplitCard from "./components/AutomaticSplitCard";
import EmergencyTransferCard from "./components/EmergencyTransferCard";

export default function SendMoney() {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <SendHeader />

      <main className="mx-auto px-4 sm:px-6 max-w-7xl lg:px-30 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:flex-[2]">
            <RecipientAddressInput />
            <AmountCurrencySection />
            <EmergencyTransferCard
              onAction={() => setShowEmergencyModal(true)}
            />
          </div>
          <div className="lg:flex-[1]">
            <AutomaticSplitCard />
          </div>
        </div>
      </main>

      <EmergencyTransferModal
        open={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
    </div>
  );
}
