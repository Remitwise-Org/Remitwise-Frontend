"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Copy,
  Share2,
  Download,
  Wallet,
  TrendingUp,
  FileText,
  Shield,
  ArrowRight,
  ChevronRight,
  X
} from "lucide-react";
import Link from "next/link";

interface SplitDetail {
  icon: React.ElementType;
  label: string;
  amount: number;
  percentage: number;
  color: string;
}

interface TransactionSuccessReceiptProps {
  hash: string;
  amount: number;
  currency: string;
  recipientName: string;
  recipientAddress: string;
  date: string;
  fee: number;
  splits?: {
    dailySpending: number;
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
  onClose
}: TransactionSuccessReceiptProps) {
  const [copied, setCopied] = useState(false);

  const truncate = (str: string) =>
    `${str.substring(0, 6)}...${str.substring(str.length - 6)}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const splitDetails: SplitDetail[] = splits ? [
    { icon: Wallet, label: "Daily Spending", amount: splits.dailySpending, percentage: 50, color: "bg-blue-500" },
    { icon: TrendingUp, label: "Savings", amount: splits.savings, percentage: 30, color: "bg-emerald-500" },
    { icon: FileText, label: "Bills", amount: splits.bills, percentage: 15, color: "bg-amber-500" },
    { icon: Shield, label: "Insurance", amount: splits.insurance, percentage: 5, color: "bg-purple-500" },
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Atmospheric Glow */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-600/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-0 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-red-600/10 mb-4 border border-red-600/20">
              <CheckCircle2 className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Transfer Successful</h2>
            <p className="text-gray-500 text-sm">Your money is on its way!</p>
          </div>

          {/* Amount Hero */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center mb-8">
            <div className="text-sm text-gray-400 mb-1">Amount Sent</div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold text-white">${amount.toFixed(2)}</span>
              <span className="text-lg font-medium text-gray-500">{currency}</span>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Recipient</span>
              <div className="text-right">
                <div className="text-white font-bold">{recipientName}</div>
                <div className="text-gray-500 text-xs font-mono">{truncate(recipientAddress)}</div>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Date & Time</span>
              <span className="text-white font-medium">{date}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Network Fee</span>
              <span className="text-white font-medium">${fee.toFixed(4)} {currency}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Transaction ID</span>
              <button 
                onClick={() => copyToClipboard(hash)}
                className="flex items-center gap-1.5 text-red-600 hover:text-red-500 transition-colors"
              >
                <span className="font-mono text-xs">{truncate(hash)}</span>
                <Copy className="w-3.5 h-3.5" />
                {copied && <span className="text-[10px] absolute -top-4 right-0 bg-white text-black px-1.5 py-0.5 rounded">Copied!</span>}
              </button>
            </div>
          </div>

          {/* Split Breakdown */}
          {splits && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                Smart Split Breakdown
                <span className="px-2 py-0.5 rounded-full bg-red-600/10 border border-red-600/20 text-[10px] text-red-600 uppercase tracking-wider font-bold">Automatic</span>
              </h3>
              <div className="space-y-3">
                {splitDetails.map((split, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <split.icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-400">{split.label}</span>
                      </div>
                      <span className="text-white font-bold">${split.amount.toFixed(2)}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${split.color} rounded-full`} 
                        style={{ width: `${split.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-colors">
              <Download className="w-4 h-4" />
              Receipt
            </button>
          </div>
          
          <a
            href={`https://stellar.expert/explorer/public/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-600/20 mb-6"
          >
            View on Stellar Explorer
            <ExternalLink className="w-4 h-4" />
          </a>

          <div className="text-center">
            <Link 
              href="/dashboard" 
              className="text-gray-500 hover:text-white text-sm font-medium inline-flex items-center gap-1 transition-colors"
            >
              Return to Dashboard
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
