"use client";

import { useEffect, useId, useState, type ClipboardEvent, type FormEvent } from "react";
import { Search } from "lucide-react";
import layoutConfig from "@/lib/config/layout.json";
import { sanitizePastedValue } from "@/lib/validation/sanitizePaste";

const { MOBILE_MAX_WIDTH } = layoutConfig.BREAKPOINTS;

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
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const updateMatch = () => setIsMobile(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener("change", updateMatch);

    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Results already update live via onChange as the user types -- submit
    // (pressing Enter) exists to reject a blank query, not to trigger the
    // search itself.
    setError(value.trim().length === 0 ? "Enter a search term before submitting." : null);
  };

  const handleChange = (nextValue: string) => {
    if (error) setError(null);
    onChange?.(nextValue);
  };

  /**
   * Strip HTML tags from clipboard payloads that carry a text/html MIME type.
   * Plain-text pastes are left to the browser's default handling.
   * This prevents literal tag markup from landing in the search field when
   * content is copied from a rich editor or web page.
   */
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const { clipboardData } = event;
    if (!clipboardData || !clipboardData.types.includes("text/html")) return;

    event.preventDefault();
    const target = event.currentTarget;
    const next = sanitizePastedValue(
      clipboardData,
      target.value,
      target.selectionStart ?? target.value.length,
      target.selectionEnd ?? target.value.length,
    );
    handleChange(next);
  };

  return (
    <form role="search" onSubmit={handleSubmit} className="w-full max-w-4xl xl:min-w-[680px]" noValidate>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search size={17} className="text-[#FFFFFF80]" />
        </div>
        <input
          type="search"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={isMobile && mobilePlaceholder ? mobilePlaceholder : placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-full rounded-[14px] border border-[#FFFFFF14] bg-white/5 py-3 pl-10 pr-4 text-sm tracking-[-0.2px] text-white placeholder:text-sm placeholder:font-normal placeholder:leading-5 placeholder:text-[#FFFFFF80] focus:border-[#FFFFFF30] focus:outline-none focus:ring-2 focus:ring-red-400/60 transition-all sm:text-base sm:tracking-[-0.31px] sm:placeholder:text-base"
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </form>
  );
};

export default TransactionHistorySearchInput;
