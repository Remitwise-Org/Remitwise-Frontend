"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface TransactionHistorySearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  mobilePlaceholder?: string;
}

const TransactionHistorySearchInput = ({ 
  value = '', 
  onChange,
  placeholder = "Search by ID, recipient, or transaction hash...",
  mobilePlaceholder,
}: TransactionHistorySearchInputProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const updateMatch = () => setIsMobile(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener("change", updateMatch);

    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, []);

  return (
    <div className="relative w-full max-w-4xl xl:min-w-[680px]">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
        <Search size={17} className="text-[#FFFFFF80]" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={isMobile && mobilePlaceholder ? mobilePlaceholder : placeholder}
        className="w-full rounded-[14px] border border-[#FFFFFF14] bg-white/5 py-3 pl-10 pr-4 text-sm tracking-[-0.2px] text-white placeholder:text-sm placeholder:font-normal placeholder:leading-5 placeholder:text-[#FFFFFF80] focus:border-[#FFFFFF30] focus:outline-none focus:ring-2 focus:ring-red-400/60 transition-all sm:text-base sm:tracking-[-0.31px] sm:placeholder:text-base"
      />
    </div>
  );
};

export default TransactionHistorySearchInput;
