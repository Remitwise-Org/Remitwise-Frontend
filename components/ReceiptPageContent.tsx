"use client";

import {
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Clock,
  Copy,
  Share2,
  ArrowLeft,
  Printer,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useSeo } from "@/lib/hooks/useSeo";
import { isValidTxHash } from "@/lib/remittance/horizon";
import type { ReceiptData } from "@/lib/remittance/horizon";
import PrintReceiptTemplate from "./PrintReceiptTemplate";
import { STELLAR_CONFIG } from "@/lib/config/stellar";

interface ReceiptPageContentProps {
  txHash: string;
  receiptData: ReceiptData | null;
  notFound: boolean;
}

function truncate(str: string, start = 6, end = 6) {
  if (str.length <= start + end + 3) return str;
  return `${str.substring(0, start)}...${str.substring(str.length - end)}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function ReceiptPageContent({
  txHash,
  receiptData,
  notFound,
}: ReceiptPageContentProps) {
  useSeo({
    title: receiptData
      ? `Receipt ${truncate(txHash)} | RemitWise`
      : "Receipt | RemitWise",
    description: receiptData
      ? `View receipt for transaction ${truncate(txHash)} on RemitWise.`
      : "View transaction details and confirmation on RemitWise.",
  });

  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedHash = truncate(txHash);
  const isKnownHash = isValidTxHash(txHash);

  if (notFound || !isKnownHash) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-12 text-center">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">
          {!isKnownHash
            ? "Invalid Transaction Hash"
            : "Transaction Not Found"}
        </h1>
        <p className="text-gray-400 mb-6 max-w-md">
          {!isKnownHash
            ? `"${truncatedHash}" is not a valid Stellar transaction hash.`
            : "This transaction could not be found on the Stellar network. It may still be pending or the hash may be incorrect."}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const statusLabel =
    receiptData.status === "completed" ? "Completed" : "Failed";
  const StatusIcon =
    receiptData.status === "completed" ? CheckCircle2 : AlertCircle;
  const statusColor =
    receiptData.status === "completed"
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : "text-rose-500 bg-rose-500/10 border-rose-500/20";

  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-600/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />

      <div className="relative z-0 p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className={`mx-auto flex items-center justify-center w-20 h-20 rounded-full mb-4 border ${statusColor}`}
          >
            <StatusIcon className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Transfer {statusLabel === "Completed" ? "Successful" : "Failed"}
          </h1>
          <p className="text-gray-500 text-sm">
            {statusLabel === "Completed"
              ? "Your money is on its way!"
              : "The transaction did not complete successfully."}
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mb-8">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${statusColor}`}
          >
            <StatusIcon className="h-4 w-4" />
            {statusLabel}
          </span>
        </div>

        {/* Amount Hero */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center mb-8">
          <div className="text-sm text-gray-400 mb-1">Amount</div>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-white">
              {receiptData.amount}
            </span>
            <span className="text-lg font-medium text-gray-500">
              {receiptData.currency}
            </span>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-4 mb-8">
          <DetailRow
            label="Transaction Hash"
            value={txHash}
            truncated={truncatedHash}
            onCopy={() => copyToClipboard(txHash)}
            copied={copied}
            mono
          />
          <DetailRow
            label="Recipient"
            value={receiptData.recipient}
            truncated={truncate(receiptData.recipient)}
            mono
          />
          <DetailRow
            label="Sender"
            value={receiptData.sender}
            truncated={truncate(receiptData.sender)}
            mono
          />
          <DetailRow label="Date & Time" value={formatDate(receiptData.date)} />
          <DetailRow label="Network Fee" value={`${receiptData.fee} XLM`} />
          {receiptData.memo && (
            <DetailRow label="Memo" value={receiptData.memo} />
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({
                  title: "Transaction Receipt",
                  text: `View receipt for ${truncatedHash}`,
                  url,
                });
              } else {
                copyToClipboard(url);
              }
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>

        <a
          href={`${STELLAR_CONFIG.explorerTxUrl}${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-red-600/20 mb-6"
        >
          View on Stellar Explorer
          <ExternalLink className="h-4 w-4" />
        </a>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-gray-500 hover:text-white text-sm font-medium inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
      
      {receiptData && (
        <PrintReceiptTemplate 
          txHash={txHash}
          amount={receiptData.amount}
          currency={receiptData.currency}
          recipientName={receiptData.recipient}
          recipientAddress={receiptData.recipient}
          senderName={receiptData.sender}
          senderAddress={receiptData.sender}
          date={receiptData.date}
          fee={receiptData.fee}
          status={receiptData.status === "completed" ? "completed" : "failed"}
        />
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  truncated,
  onCopy,
  copied,
  mono,
}: {
  label: string;
  value: string;
  truncated?: string;
  onCopy?: () => void;
  copied?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500 font-medium">{label}</span>
      <div className="flex items-center gap-1.5 text-right">
        {truncated ? (
          <span
            className={`text-white font-medium ${
              mono ? "font-mono text-xs" : ""
            }`}
          >
            {truncated}
          </span>
        ) : (
          <span className="text-white font-medium">{value}</span>
        )}
        {onCopy && (
          <button
            onClick={onCopy}
            className="relative shrink-0 p-1 text-red-600 hover:text-red-500 transition-colors"
            aria-label={`Copy ${label}`}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white px-2 py-1 text-[10px] text-black">
                Copied!
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
