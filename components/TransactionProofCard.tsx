"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2, // Spinner for pending
  ExternalLink,
  Copy,
  ShieldCheck,
  AlertCircle, // Icon for failed badge
  Clock,
  Wallet,
  ArrowRightLeft,
} from "lucide-react";
import { getExplorerTxUrl } from "@/lib/utils/explorer";

interface TransactionProofProps {
  hash: string;
  amount: string;
  currency: string;
  senderAddress: string;
  recipientAddress: string;
  date: string;
  status: "success" | "pending" | "failed";
  fee: string;
  memo?: string;
}

export default function TransactionProofCard({
  hash,
  amount,
  currency,
  senderAddress,
  recipientAddress,
  date,
  status,
  fee,
  memo,
}: TransactionProofProps) {
  const [copied, setCopied] = useState<string | null>(null);

  // 1. Configuration Map: Handles all Status Logic
  const statusConfig = {
    success: {
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
      badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-100",
      badgeIcon: ShieldCheck,
      badgeText: "On-Chain Verified",
      title: "Transfer Successful",
      spin: false,
    },
    pending: {
      icon: Loader2,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      badgeColor: "text-amber-700 bg-amber-50 border-amber-100",
      badgeIcon: Clock,
      badgeText: "Processing Transaction",
      title: "Transfer Pending",
      spin: true, // To animate the spinner
    },
    failed: {
      icon: XCircle,
      color: "text-rose-500",
      bgColor: "bg-rose-50",
      badgeColor: "text-rose-700 bg-rose-50 border-rose-100",
      badgeIcon: AlertCircle,
      badgeText: "Transaction Failed",
      title: "Transfer Failed",
      spin: false,
    },
  };

  // Get current config based on status
  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;
  const BadgeIcon = currentStatus.badgeIcon;

  // Helper to truncate long addresses
  const truncate = (str: string) =>
    `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden font-sans">
      {/* 2. Header Section: Dynamic Status & Trust */}
      <div className="bg-gradient-to-b from-blue-50/50 to-white p-8 text-center border-b border-gray-50">
        {/* Dynamic Status Icon Circle */}
        <div
          className={`mx-auto flex items-center justify-center w-20 h-20 rounded-full mb-5 shadow-sm ${currentStatus.bgColor}`}
        >
          <StatusIcon
            className={`w-10 h-10 ${currentStatus.color} ${currentStatus.spin ? "animate-spin" : ""}`}
          />
        </div>

        {/* Dynamic Title */}
        <h2 className="text-2xl font-bold text-gray-900">
          {currentStatus.title}
        </h2>

        {/* Dynamic Verification Badge */}
        <div
          className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${currentStatus.badgeColor}`}
        >
          <BadgeIcon className="w-3.5 h-3.5" />
          {currentStatus.badgeText}
        </div>

        {/* Amount Hero */}
        <div className="mt-8">
          <span className="text-5xl font-extrabold text-gray-900 tracking-tight">
            {amount}
          </span>
          <span className="text-xl text-gray-400 font-medium ml-2">
            {currency}
          </span>
        </div>
      </div>

      {/* 3. Details Section (Remains Consistent) */}
      <div className="px-6 py-2 space-y-5">
        <div className="flex justify-between items-center py-3 border-b border-gray-50">
          <div className="flex items-center text-gray-400 text-sm font-medium">
            <Clock className="w-4 h-4 mr-3 text-[#2664eb]" />
            <span>Time Completed</span>
          </div>
          <span className="text-gray-900 font-semibold text-sm">{date}</span>
        </div>

        <div className="flex justify-between items-center py-3 border-b border-gray-50">
          <div className="flex items-center text-gray-400 text-sm font-medium">
            <Wallet className="w-4 h-4 mr-3 text-[#2664eb]" />
            <span>From</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
              {truncate(senderAddress)}
            </span>
            <button
              onClick={() => copyToClipboard(senderAddress, "sender")}
              className="text-gray-300 hover:text-[#2664eb] transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center py-3 border-b border-gray-50">
          <div className="flex items-center text-gray-400 text-sm font-medium">
            <ArrowRightLeft className="w-4 h-4 mr-3 text-[#2664eb]" />
            <span>To</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
              {truncate(recipientAddress)}
            </span>
            <button
              onClick={() => copyToClipboard(recipientAddress, "recipient")}
              className="text-gray-300 hover:text-[#2664eb] transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <span className="block text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
              Network Fee
            </span>
            <span className="text-sm font-semibold text-gray-900">{fee}</span>
          </div>
          {memo && (
            <div className="text-right">
              <span className="block text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                Memo
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {memo}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Footer */}
      <div className="bg-gray-50 p-6 mt-4 space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">
            Transaction Hash
          </label>
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-sm group hover:border-[#2664eb]/30 transition-colors">
            <code className="text-xs font-mono text-gray-500 truncate max-w-[220px]">
              {hash}
            </code>
            <button
              onClick={() => copyToClipboard(hash, "hash")}
              className="flex items-center gap-1.5 text-xs font-bold text-[#2664eb] hover:text-blue-700"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied === "hash" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {(() => {
          const explorerUrl = getExplorerTxUrl(hash);
          if (!explorerUrl) return null;

          return (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#2664eb] hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]"
            >
              View on Stellar Explorer
              <ExternalLink className="w-4 h-4" />
            </a>
          );
        })()}
      </div>
    </div>
  );
}
