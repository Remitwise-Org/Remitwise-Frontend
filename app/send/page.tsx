"use client";

import { useState } from "react";
import EmergencyTransferModal from "./components/EmergencyTransferModal";
import AmountCurrencySection from "./components/AmountCurrencySection";

import Link from "next/link";
import { ArrowLeft, Send, AlertCircle, Zap } from "lucide-react";

export default function SendMoney() {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [previewAmount, setPreviewAmount] = useState<number | null>(null);
  const [previewCurrency, setPreviewCurrency] = useState<string | null>(null);

  const handlePreview = () => {
    // Handle preview transaction
    console.log("Preview transaction clicked");
  };

  const handleSend = (amount: number, currency: string) => {
    setPreviewAmount(amount);
    setPreviewCurrency(currency);
    // Handle send remittance
    console.log(`Send ${amount} ${currency}`);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-neutral-950 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-white transition">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Send Remittance</h1>
              <p className="text-sm text-gray-400">Transfer money via Stellar network</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition">
            <AlertCircle className="w-5 h-5" />
            <span>Address Book</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipient Address Section - Placeholder */}
            <div className="bg-neutral-950 rounded-xl p-6 border border-gray-800">
              <label className="block text-sm font-medium text-gray-200 mb-4">
                Recipient Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
                disabled
              />
              <p className="text-sm text-gray-400 mb-4">Stellar address of the recipient wallet</p>
              
              {/* Recent Recipients Placeholder */}
              <div>
                <p className="text-xs text-gray-500 mb-3">Recent Recipients</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-full transition">Family</button>
                  <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-full transition">John D.</button>
                  <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-full transition">Maria S.</button>
                </div>
              </div>
            </div>

            {/* Emergency Transfer Section - Placeholder */}
            <div className="bg-red-950/30 border border-red-900 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Zap className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Emergency Transfer</h3>
                  <p className="text-gray-400 mb-4">Need to send money urgently? Bypass split allocation for immediate delivery.</p>
                  <button
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                    onClick={() => setShowEmergencyModal(true)}
                  >
                    <Zap className="w-5 h-5" />
                    Emergency Transfer
                  </button>
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-4">⚠️ Emergency transfers incur a 2% processing fee and bypass your automatic split rules.</p>
            </div>
          </div>

          {/* Right Column - Automatic Split Preview - Placeholder */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-950 rounded-xl p-6 border border-gray-800 sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-white">Automatic Split</h3>
              </div>
              
              <p className="text-sm text-gray-400 mb-6">Your remittance will be automatically split according to configured allocation rules:</p>
              
              {/* Split Items */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">Daily Spending</span>
                    <span className="text-sm font-semibold text-white">$0.00</span>
                    <span className="text-xs text-gray-500">50%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: "50%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">Savings</span>
                    <span className="text-sm font-semibold text-white">$0.00</span>
                    <span className="text-xs text-gray-500">30%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: "30%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">Bills</span>
                    <span className="text-sm font-semibold text-white">$0.00</span>
                    <span className="text-xs text-gray-500">15%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: "15%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">Insurance</span>
                    <span className="text-sm font-semibold text-white">$0.00</span>
                    <span className="text-xs text-gray-500">5%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: "5%" }}></div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-gray-800 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-400">Total Amount</span>
                  <span className="text-3xl font-bold text-white">$0.00</span>
                </div>
                <p className="text-xs text-gray-500 mt-3">Enter an amount to see split preview</p>
              </div>

              {/* Info */}
              <div className="mt-6 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400">
                  <span className="text-green-400 font-semibold">⚡ Fast & Secure:</span> Settles on Stellar network in 3-5 seconds with minimal fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Emergency Transfer Modal */}
      <EmergencyTransferModal
        open={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
    </div>
  );
}
