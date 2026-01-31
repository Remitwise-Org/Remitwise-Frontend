"use client";

import { useState, useEffect } from "react";

interface RecipientAddressInputProps {
  onAddressChange?: (address: string) => void;
  initialAddress?: string;
}

const RECENT_RECIPIENTS = [
  { name: "Family", address: "GAFAMILYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  { name: "John D.", address: "GAJOHNDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  { name: "Maria S.", address: "GAMARIASXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
];

export default function RecipientAddressInput({ 
  onAddressChange, 
  initialAddress = "" 
}: RecipientAddressInputProps) {
  const [address, setAddress] = useState(initialAddress);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    // Simple Stellar address validation: Starts with G, 56 characters
    const stellarRegex = /^G[A-Z2-7]{55}$/;
    const valid = address === "" || stellarRegex.test(address);
    setIsValid(valid);
    
    if (onAddressChange) {
      onAddressChange(address);
    }
  }, [address, onAddressChange]);

  const handleRecentClick = (recentAddress: string) => {
    setAddress(recentAddress);
  };

  return (
    <div className="mx-auto relative overflow-hidden bg-[#0c0c0c] border border-white/5 rounded-[2rem] p-8 sm:p-10 mb-8 shadow-2xl">
      {/* Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-900/20 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/[0.02] blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Label */}
        <label className="block text-xl font-bold text-white tracking-tight">
          Recipient Address <span className="text-red-500 ml-1">*</span>
        </label>

        {/* Input Field */}
        <div className="relative group">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            className={`w-full bg-[#161616]/80 backdrop-blur-sm placeholder:text-white/30 text-gray-300 px-7 text-xl py-4 rounded-2xl border ${
              isValid ? "border-white/5" : "border-red-500/50"
            } focus:outline-none focus:ring-1 focus:ring-red-600/30 transition-all font-mono text-sm placeholder:text-gray-700`}
            aria-required="true"
            aria-invalid={!isValid}
          />
          {!isValid && (
            <p className="mt-3 text-xs text-red-500 font-medium">
              Please enter a valid Stellar address (starts with G, 56 characters).
            </p>
          )}
        </div>

        {/* Helper Text */}
        <p className="text-[0.9375rem] text-[#666666] leading-relaxed">
          Stellar address of the recipient wallet
        </p>

        {/* Separator */}
        <div className="h-px bg-white/5 w-full my-8" />

        {/* Recent Recipients */}
        <div className="space-y-4">
          <h3 className="text-[0.9375rem] font-medium text-[#444444]">Recent Recipients</h3>
          <div className="flex flex-wrap gap-3">
            {RECENT_RECIPIENTS.map((recipient) => (
              <button
                key={recipient.name}
                type="button"
                onClick={() => handleRecentClick(recipient.address)}
                className="bg-[#1a1a1a] hover:bg-[#222222] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border border-white/5 active:scale-95"
              >
                {recipient.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
