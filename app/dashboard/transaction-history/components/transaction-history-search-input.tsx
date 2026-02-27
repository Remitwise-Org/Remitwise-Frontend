"use client";

import { Search } from "lucide-react";

interface TransactionHistorySearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const TransactionHistorySearchInput = ({ 
  value = '', 
  onChange,
  placeholder = "Search by ID, recipient, or transaction hash..."
}: TransactionHistorySearchInputProps) => {
  return (
    <div className="relative w-full xl:min-w-[780.81px] max-w-3xl">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
        <Search size={17} className="text-[#FFFFFF80]" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="bg-white/5 border border-[#FFFFFF14] rounded-[14px] pl-10 pr-4 py-3 text-white placeholder:text-[#FFFFFF80] placeholder:font-normal placeholder:text-base placeholder:leading-[100%] tracking-[-0.31px] focus:outline-none focus:border-[#FFFFFF30] transition-all w-full"
      />
    </div>
  );
};

export default TransactionHistorySearchInput;
