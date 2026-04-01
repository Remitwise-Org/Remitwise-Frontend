"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { CheckCircle2, Copy, ClipboardPaste, QrCode, AlertCircle } from "lucide-react";
import { StrKey } from "@stellar/stellar-sdk";

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
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const statusId = `${inputId}-status`;
  const [address, setAddress] = useState(initialAddress);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [pasteState, setPasteState] = useState<"idle" | "pasted" | "error">("idle");

  useEffect(() => {
    if (onAddressChange) {
      onAddressChange(address);
    }
  }, [address, onAddressChange]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  useEffect(() => {
    if (pasteState === "idle") return;
    const timer = window.setTimeout(() => setPasteState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [pasteState]);

  const normalizeAddress = (value: string) => value.toUpperCase().replace(/\s+/g, "").trim();

  const validation = useMemo(() => {
    if (!address) {
      return {
        tone: "idle" as const,
        message: "Paste a Stellar wallet address to verify its checksum before sending.",
      };
    }

    const normalizedAddress = normalizeAddress(address);

    if (!normalizedAddress.startsWith("G")) {
      return {
        tone: "error" as const,
        message: "Recipient address must start with G.",
      };
    }

    if (normalizedAddress.length !== 56) {
      return {
        tone: "error" as const,
        message: `Recipient address must be 56 characters. ${normalizedAddress.length}/56 entered.`,
      };
    }

    if (!/^[A-Z2-7]+$/.test(normalizedAddress)) {
      return {
        tone: "error" as const,
        message: "Recipient address contains unsupported characters.",
      };
    }

    if (!StrKey.isValidEd25519PublicKey(normalizedAddress)) {
      return {
        tone: "error" as const,
        message: "Checksum failed. Double-check the address before sending.",
      };
    }

    return {
      tone: "success" as const,
      message: "Checksum verified. This is a valid Stellar public key.",
    };
  }, [address]);

  const isInvalid = validation.tone === "error";
  const isValid = validation.tone === "success";

  const handleRecentClick = (recentAddress: string) => {
    setAddress(normalizeAddress(recentAddress));
  };

  const handleInputChange = (value: string) => {
    setAddress(normalizeAddress(value));
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        setPasteState("error");
        return;
      }

      setAddress(normalizeAddress(clipboardText));
      setPasteState("pasted");
    } catch (error) {
      console.error("Failed to paste address from clipboard:", error);
      setPasteState("error");
    }
  };

  const handleCopyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopyState("copied");
    } catch (error) {
      console.error("Failed to copy recipient address:", error);
      setCopyState("error");
    }
  };

  return (
    <div className="mx-auto relative overflow-hidden bg-[#0c0c0c] border border-white/5 rounded-[2rem] p-8 sm:p-10 mb-8 shadow-2xl">
      {/* Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-900/20 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/[0.02] blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Label */}
        <label htmlFor={inputId} className="block text-xl font-bold text-white tracking-tight">
          Recipient Address <span className="text-red-500 ml-1">*</span>
        </label>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0c]"
            >
              <ClipboardPaste className="h-4 w-4" />
              Paste
            </button>
            <button
              type="button"
              onClick={handleCopyAddress}
              disabled={!address}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0c] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Copy className="h-4 w-4" />
              {copyState === "copied" ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="QR scanning is not yet available."
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-sm font-semibold text-white/55"
            >
              <QrCode className="h-4 w-4" />
              Scan QR
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-white/60">
                Soon
              </span>
            </button>
          </div>

          <div className="relative group">
            <input
              id={inputId}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={address}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className={`w-full rounded-2xl border bg-[#161616]/80 px-5 py-4 pr-14 font-mono text-sm text-gray-200 backdrop-blur-sm transition placeholder:text-white/25 ${
                isValid
                  ? "border-emerald-500/40 focus:border-emerald-400/50"
                  : isInvalid
                    ? "border-red-500/60 focus:border-red-500/70"
                    : "border-white/8 focus:border-white/15"
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0c]`}
              aria-required="true"
              aria-invalid={isInvalid}
              aria-describedby={`${hintId} ${statusId}`}
            />
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
              {isValid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              ) : isInvalid ? (
                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
              ) : null}
            </div>
          </div>
        </div>

        {/* Helper Text */}
        <div className="space-y-2">
          <p id={hintId} className="text-[0.9375rem] leading-relaxed text-[#8a8a8a]">
            Stellar public key for the recipient wallet. We normalize pasted input and verify the checksum before send.
          </p>
          <p
            id={statusId}
            className={`flex items-center gap-2 text-sm font-medium ${
              isValid ? "text-emerald-400" : isInvalid ? "text-red-400" : "text-[#a3a3a3]"
            }`}
            aria-live="polite"
          >
            {isValid ? (
              <CheckCircle2 className="h-4 w-4 flex-none" aria-hidden="true" />
            ) : isInvalid ? (
              <AlertCircle className="h-4 w-4 flex-none" aria-hidden="true" />
            ) : null}
            {validation.message}
          </p>
          {(copyState === "error" || pasteState === "error" || pasteState === "pasted") && (
            <p className="text-xs text-[#b3b3b3]" aria-live="polite">
              {pasteState === "pasted" && "Address pasted from clipboard."}
              {pasteState === "error" && "Clipboard paste is unavailable in this browser context."}
              {copyState === "error" && " Copy failed. Try selecting the address manually."}
            </p>
          )}
          {address && (
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              {address.length}/56 characters
            </p>
          )}
        </div>

        {isValid && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Address checksum verified. You can safely continue to amount and send details.
          </div>
        )}

        {isInvalid && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            Fix the recipient address before continuing. A valid Stellar public key must pass both format and checksum validation.
          </div>
        )}

        <p className="text-[0.9375rem] text-[#666666] leading-relaxed">
          QR capture is intentionally parked for now; the disabled action keeps the hook visible for a future scanner flow.
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
