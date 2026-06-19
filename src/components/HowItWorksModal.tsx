import React, { useRef } from "react";
import { AlertCircle } from "lucide-react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HowItWorksModal = ({ isOpen, onClose }: HowItWorksModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const data = [
    { label: "Daily Spending", amount: "$500.00", percentage: "50%" },
    { label: "Savings", amount: "$300.00", percentage: "30%" },
    { label: "Bills", amount: "$150.00", percentage: "15%" },
    { label: "Insurance", amount: "$50.00", percentage: "5%" },
  ];

  // Focus trap hook
  useFocusTrap({
    isActive: isOpen,
    onEscape: onClose,
    onOverlayClick: onClose,
    restoreFocusOnClose: true,
  });

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-[rgba(220,38,38,0.20)] bg-gradient-to-br from-[#1A0505] to-[#0F0505] p-8 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#DC262633]">
            <AlertCircle className="h-5 w-5 text-[#DC2626]" />
          </div>

          <div className="flex-1">
            <h2
              id="how-it-works-title"
              className="mb-4 text-xl font-semibold text-white"
            >
              How It Works
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-gray-400">
              When you send a remittance, the amount is automatically
              split according to these percentages. Your family receives
              the money already organized into different wallets.
            </p>

            <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-black/40 p-6">
              <p className="mb-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Example: If you send $1,000
              </p>

              <div className="space-y-4">
                {data.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-gray-300">
                      {item.label}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-white">
                        {item.amount}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({item.percentage})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-zinc-800 py-3 font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksModal;
