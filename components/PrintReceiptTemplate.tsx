import React from "react";
import QRCode from "react-qr-code";
import { formatCurrency } from "@/lib/utils/format-currency";
import { useClientLocale } from "@/lib/i18n/client";
import { STELLAR_CONFIG } from "@/lib/config/stellar";

export interface PrintReceiptTemplateProps {
  txHash: string;
  amount: number | string;
  currency: string;
  recipientName?: string;
  recipientAddress: string;
  senderName?: string;
  senderAddress?: string;
  date: string;
  fee?: number | string;
  status?: "completed" | "failed";
}

export default function PrintReceiptTemplate({
  txHash,
  amount,
  currency,
  recipientName,
  recipientAddress,
  senderName,
  senderAddress,
  date,
  fee,
  status = "completed",
}: PrintReceiptTemplateProps) {
  const locale = useClientLocale();
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const formattedAmount = formatCurrency(numAmount, currency, locale);

  const numFee = typeof fee === "string" ? parseFloat(fee) : fee;
  const formattedFee = fee !== undefined ? formatCurrency(numFee, currency, locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }) : undefined;

  const explorerUrl = `${STELLAR_CONFIG.explorerTxUrl}${txHash}`;

  return (
    <div className="hidden print:flex flex-row w-full min-h-screen bg-white text-black p-10 font-sans">
      <style>{`
        @page { size: landscape; margin: 20mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      
      {/* Left Column: Details */}
      <div className="flex-1 pr-10 border-r border-gray-300">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">RemitWise</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Transaction Receipt</p>
        </div>

        <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-10">
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Date & Time</div>
            <div className="text-sm font-medium">{date}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</div>
            <div className={`text-sm font-bold uppercase ${status === "completed" ? "text-emerald-600" : "text-rose-600"}`}>
              {status}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Sender</div>
            <div className="text-sm font-medium">{senderName || "Unknown"}</div>
            {senderAddress && <div className="text-xs font-mono text-gray-600 mt-0.5 break-all">{senderAddress}</div>}
          </div>

          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Recipient</div>
            <div className="text-sm font-medium">{recipientName || "Unknown"}</div>
            <div className="text-xs font-mono text-gray-600 mt-0.5 break-all">{recipientAddress}</div>
          </div>

          <div className="col-span-2">
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Transaction ID</div>
            <div className="text-sm font-mono text-gray-800 break-all">{txHash}</div>
          </div>
        </div>
      </div>

      {/* Right Column: Amount & QR */}
      <div className="w-[300px] pl-10 flex flex-col justify-between items-center text-center">
        <div className="w-full bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="text-sm text-gray-500 uppercase font-semibold mb-2">Total Amount</div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{formattedAmount}</div>
          <div className="text-base font-medium text-gray-600">{currency}</div>
          {formattedFee && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
              <span>Network Fee</span>
              <span className="font-medium text-gray-700">{formattedFee}</span>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center">
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm mb-3">
            <QRCode value={explorerUrl} size={140} level="H" />
          </div>
          <p className="text-xs text-gray-500 font-medium">Scan to view on Explorer</p>
        </div>
      </div>
    </div>
  );
}
