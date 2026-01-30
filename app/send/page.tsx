"use client";

import { useState } from "react";
import EmergencyTransferModal from "./components/EmergencyTransferModal";

import Link from "next/link";
import { ArrowLeft, Send, AlertCircle } from "lucide-react";
import SendHeader from "./components/SendHeader";
import RecipientAddressInput from "./components/RecipientAddressInput";
import EmergencyTransferCard from "./components/EmergencyTransferCard";

export default function SendMoney() {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <SendHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RecipientAddressInput />

        <EmergencyTransferCard onAction={() => setShowEmergencyModal(true)} />

        <EmergencyTransferModal
          open={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
        />
      </main>
    </div>
  );
}
