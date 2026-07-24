"use client";

import type { RefObject } from "react";
import { Loader2 } from "lucide-react";

interface ITransactionHistoryLoadMoreProps {
  loading: boolean;
  onLoadMore: () => void;
  sentinelRef: RefObject<HTMLDivElement | null>;
  label: string;
  loadingLabel: string;
}

// The sentinel lets `useInfiniteScrollObserver` auto-load as the user
// scrolls, but the button is always rendered alongside it: keyboard and
// screen reader users, and anyone with reduced motion enabled (which
// disables the observer), rely on it as the only way to load more.
const TransactionHistoryLoadMore: React.FC<ITransactionHistoryLoadMoreProps> = ({
  loading,
  onLoadMore,
  sentinelRef,
  label,
  loadingLabel,
}) => {
  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="min-h-[48px] rounded-xl bg-[#FF4B26] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#FF4B26]/80 disabled:opacity-50 disabled:cursor-not-allowed sm:text-base"
        >
          {loading ? loadingLabel : label}
        </button>
      </div>
      {loading && (
        <div
          className="mt-4 flex justify-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-6 h-6 text-[#FF4B26] animate-spin" aria-hidden="true" />
          <span className="sr-only">{loadingLabel}</span>
        </div>
      )}
    </>
  );
};

export default TransactionHistoryLoadMore;
