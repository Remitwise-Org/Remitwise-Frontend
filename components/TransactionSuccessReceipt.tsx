"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Share2,
  Printer,
  ChevronRight,
  X,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useClientLocale } from "@/lib/i18n/client";
import { formatCurrency } from "@/lib/utils/format-currency";
import TransactionStatusIndicator from "@/components/TransactionStatusIndicator";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import PrintReceiptTemplate from "./PrintReceiptTemplate";
import { getExplorerTxUrl } from "@/lib/utils/explorer";
import { SPLIT_BUCKETS } from "@/lib/config/split-buckets";

interface TransactionSuccessReceiptProps {
  hash: string;
  amount: number;
  currency: string;
  recipientName: string;
  recipientAddress: string;
  date: string;
  fee: number;
  splits?: {
    spending: number;
    savings: number;
    bills: number;
    insurance: number;
  };
  onClose: () => void;
}

export default function TransactionSuccessReceipt({
  hash,
  amount,
  currency,
  recipientName,
  recipientAddress,
  date,
  fee,
  splits,
  onClose,
}: TransactionSuccessReceiptProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const locale = useClientLocale();
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const formattedAmount = formatCurrency(amount, currency, locale);
  const formattedFee = formatCurrency(fee, currency, locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  const showCurrencyLabel = !formattedAmount.endsWith(` ${currency}`);

  const truncate = (str: string) =>
    `${str.substring(0, 6)}...${str.substring(str.length - 6)}`;

  const copyHash = () => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleShare = async () => {
    const explorerUrl = getExplorerTxUrl(hash);
    const shareText = `Sent ${formattedAmount} to ${recipientName} via RemitWise`;
    const shareUrl = explorerUrl ?? "";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "RemitWise Transfer",
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User dismissed share sheet
      }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const splitEntries = splits
    ? SPLIT_BUCKETS.map((bucket) => ({
        ...bucket,
        amount: splits[bucket.key],
      }))
    : [];

  const explorerUrl = getExplorerTxUrl(hash);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm ${
        prefersReducedMotion ? "" : "animate-in fade-in duration-300"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-heading"
        className={`relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl ${
          prefersReducedMotion ? "" : "animate-in zoom-in-95 duration-300"
        }`}
      >
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-600/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-10"
          aria-label="Close receipt"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-0 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2
              id="receipt-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-xl sm:text-2xl font-bold text-white mb-1 outline-none"
            >
              Transfer Successful
            </h2>
            <p className="text-gray-500 text-sm">Your money is on its way!</p>
            <div className="mt-3 flex justify-center">
              <TransactionStatusIndicator txHash={hash} />
            </div>
          </div>

          {/* Amount + Recipient Hero */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 mb-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-2">
              Amount Sent
            </div>
            <div className="flex items-baseline justify-center gap-2 mb-3">
              <span className="text-3xl sm:text-4xl font-bold text-white">
                {formattedAmount}
              </span>
              {showCurrencyLabel && (
                <span className="text-base font-medium text-gray-400">
                  {currency}
                </span>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm border-t border-white/[0.06] pt-3">
              <span className="text-gray-400">To</span>
              <span className="text-white font-medium">{recipientName}</span>
              <span className="text-gray-500 font-mono text-xs">
                {truncate(recipientAddress)}
              </span>
            </div>
          </div>

          {/* Split Breakdown */}
          {splits && splitEntries.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Split Breakdown
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-red-600/10 border border-red-600/20 text-[10px] text-red-400 uppercase tracking-wider font-semibold">
                  Automatic
                </span>
              </div>
              <div className="space-y-2.5">
                {splitEntries.map((bucket) => (
                  <div key={bucket.key} className="flex items-center gap-3">
                    <bucket.icon className={`w-4 h-4 ${bucket.textColor}`} />
                    <span className="text-sm text-gray-400 flex-1">
                      {bucket.label}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {formatCurrency(bucket.amount, currency, locale)}
                    </span>
                    <div className="w-20 sm:w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${bucket.barColor}`}
                        style={{
                          width: `${(bucket.amount / amount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction Details */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 mb-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-3">
              Transaction Details
            </div>
            <div className="space-y-3">
              <DetailRow label="Date & Time" value={date} />
              <DetailRow label="Network Fee" value={formattedFee} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Transaction ID</span>
                <button
                  onClick={copyHash}
                  className="flex items-center gap-1.5 text-white hover:text-red-400 transition-colors"
                  aria-label="Copy transaction hash"
                >
                  <span className="font-mono text-xs">{truncate(hash)}</span>
                  {copiedHash ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {copiedHash && (
                <p role="status" aria-live="polite" className="sr-only">
                  Transaction hash copied
                </p>
              )}
            </div>
          </div>

          {/* Explorer Link */}
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors mb-5"
            >
              <ExternalLink className="w-4 h-4" />
              View on Stellar Explorer
            </a>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              {shareCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Link Copied
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share
                </>
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Receipt
            </button>
          </div>
          {shareCopied && (
            <p role="status" aria-live="polite" className="sr-only">
              Share link copied to clipboard
            </p>
          )}

          {/* Navigation Links */}
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-red-600/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Send Another Transfer
            </button>
            <div className="text-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-gray-500 hover:text-white text-sm font-medium transition-colors"
              >
                Return to Dashboard
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PrintReceiptTemplate
        txHash={hash}
        amount={amount}
        currency={currency}
        recipientName={recipientName}
        recipientAddress={recipientAddress}
        date={date}
        fee={fee}
        status="completed"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small helper component for detail rows                             */
/* ------------------------------------------------------------------ */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
