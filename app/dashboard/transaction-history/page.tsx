"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Download, FilterIcon, Loader2, SearchX, Inbox, X } from "lucide-react";
import TransactionHistoryItem from "@/components/Dashboard/TransactionHistoryItem";
import TransactionHistoryHeader from "./components/transaction-history-header";
import TransactionHistorySearchInput from "./components/transaction-history-search-input";
import Button from "./components/transaction-history-button";
import { Download, FilterIcon, Loader2 } from "lucide-react";
import { TransactionItem } from '@/lib/remittance/horizon';
import { useClientTranslator } from '@/lib/i18n/client';
import { apiClient } from '@/lib/client/apiClient';

const TransactionHistoryPage = () => {
  const { t } = useClientTranslator();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "failed" | "pending">("all");
  const [directionFilter, setDirectionFilter] = useState<Direction>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const yesterdayStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return startOfDay(d);
  }, []);

      const response = await apiClient.get(`/api/v1/remittance/history?${params}`);
      if (!response) return; // Handled by session expiry flow

      if (!response.ok) {
        throw new Error(t('transactionHistory.alerts.fetchFailed'));
      }

  const fetchTransactions = useCallback(
    async (currentCursor?: string, reset = false) => {
      try {
        if (reset) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const params = new URLSearchParams();
        params.append("limit", "50");
        if (currentCursor && !reset) {
          params.append("cursor", currentCursor);
        }
        if (statusFilter !== "all") {
          params.append("status", statusFilter);
        }

        const response = await fetch(`/api/v1/remittance/history?${params}`);
        if (!response.ok) {
          throw new Error(t("transactionHistory.alerts.fetchFailed"));
        }

        const data = await response.json();

        if (data.userAddress) {
          setUserAddress(data.userAddress);
        }

        if (reset) {
          setTransactions(data.transactions || []);
        } else {
          setTransactions((prev) => [...prev, ...(data.transactions || [])]);
        }

        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t("transactionHistory.alerts.genericError")
        );
      } finally {
        setLoading(false);
        setInitialLoading(false);
        setLoadingMore(false);
      }
      
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('transactionHistory.alerts.genericError'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    fetchTransactions(undefined, true);
  }, [fetchTransactions]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      fetchTransactions(cursor, false);
    }
  }, [hasMore, loadingMore, cursor, fetchTransactions]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setDirectionFilter("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    statusFilter !== "all" ||
    directionFilter !== "all" ||
    dateFrom.length > 0 ||
    dateTo.length > 0;

  const filteredTransactions = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    return transactions.filter((tx) => {
      if (statusFilter !== "all") {
        if (tx.status === "pending" && statusFilter !== "pending") return false;
        if (tx.status === "completed" && statusFilter !== "completed") return false;
        if (tx.status === "failed" && statusFilter !== "failed") return false;
      }

      if (directionFilter !== "all" && userAddress) {
        const isSent = tx.sender === userAddress;
        if (directionFilter === "sent" && !isSent) return false;
        if (directionFilter === "received" && isSent) return false;
      }

      if (dateFrom) {
        const txDate = new Date(tx.date);
        const fromDate = new Date(dateFrom);
        if (txDate < fromDate) return false;
      }
      if (dateTo) {
        const txDate = new Date(tx.date);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (txDate > toDate) return false;
      }

      if (query.length > 0) {
        const searchableText = [
          tx.hash,
          tx.recipient,
          tx.sender,
          tx.memo || "",
          tx.amount,
          tx.currency,
          tx.id,
        ]
          .join(" ")
          .toLowerCase();
        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  }, [transactions, debouncedSearch, statusFilter, directionFilter, dateFrom, dateTo, userAddress]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<GroupKey, Transaction[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    filteredTransactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const groupKey = getGroupKey(txDate, todayStart, yesterdayStart);
      const isSent = userAddress ? tx.sender === userAddress : tx.sender !== tx.recipient;

      const componentTx: Transaction = {
        id: tx.hash.slice(0, 8),
        hash: tx.hash,
        type: isSent ? "Send Money" : "Received",
        amount: parseFloat(tx.amount) * (isSent ? -1 : 1),
        currency: tx.currency,
        counterpartyName: isSent ? tx.recipient : tx.sender,
        counterpartyLabel: isSent ? "To" : "From",
        date: new Date(tx.date).toLocaleString(),
        fee: 0,
        status: (tx.status === "completed"
          ? "Completed"
          : tx.status === "failed"
            ? "Failed"
            : "Pending") as TransactionStatus,
      };

      groups[groupKey].push(componentTx);
    });

    return groups;
  }, [filteredTransactions, todayStart, yesterdayStart, userAddress]);

  const totalCount = transactions.length;
  const filteredCount = filteredTransactions.length;
  const isLoading = initialLoading && loading;
  const noTransactions = !isLoading && !error && totalCount === 0;
  const noResults = !isLoading && !error && totalCount > 0 && filteredCount === 0 && hasActiveFilters;

  const resultsAriaLive = useMemo(() => {
    if (filteredCount === 0) return t("transactionHistory.resultsAriaLive.none");
    if (filteredCount === 1) return t("transactionHistory.resultsAriaLive.one");
    return t("transactionHistory.resultsAriaLive.many").replace(
      "{{count}}",
      String(filteredCount)
    );
  }, [filteredCount, t]);

  return (
    <main className="w-full min-h-screen bg-[#010101] font-inter">
      <TransactionHistoryHeader
        title={t("transactionHistory.title")}
        subtitle={
          totalCount > 0
            ? t("transactionHistory.resultsCount").replace(
                "{{count}}",
                String(totalCount)
              )
            : t("transactionHistory.resultsCountZero")
        }
      />

      <div className="mx-4 mt-8 md:mx-20 md:mt-10">
        {/* Search and Action Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[#FFFFFF14] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] px-4 py-6 sm:gap-5">
          <TransactionHistorySearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("transactionHistory.searchPlaceholder")}
            mobilePlaceholder={t("transactionHistory.searchPlaceholderMobile")}
          />
          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button
              icon={<FilterIcon size={17} className="text-white" />}
              text={t("transactionHistory.filters")}
              onclick={() => {
                const el = document.getElementById("transaction-filters-panel");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            />
            <Button
              icon={<Download size={17} className="text-white" />}
              text={t("transactionHistory.export")}
              onclick={() => {
                const rows = Object.values(groupedTransactions)
                  .flat()
                  .map((tx) => ({
                    id: tx.id,
                    hash: tx.hash || "",
                    type: tx.type,
                    status: tx.status,
                    amount: tx.amount,
                    currency: tx.currency,
                    counterparty: tx.counterpartyName,
                    date: tx.date,
                    fee: tx.fee,
                  }));

                if (rows.length === 0) return;

                const csv = [
                  Object.keys(rows[0]).join(","),
                  ...rows.map((row) =>
                    Object.values(row)
                      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                      .join(",")
                  ),
                ].join("\n");

                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "remitwise-transactions.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}
            />
          </div>
        </div>

        {/* Filters Panel */}
        <div
          id="transaction-filters-panel"
          className="mt-6 rounded-2xl border border-[#FFFFFF14] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] px-4 py-5 sm:px-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <FilterIcon className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold text-white">
              {t("transactionHistory.filtersHeading")}
            </h2>
          </div>

          {/* Status Tabs */}
          <fieldset className="mb-5">
            <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-3">
              {t("transactionHistory.statusFilterLabel", "Status")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {(["all", "completed", "pending", "failed"] as const).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(status);
                      setCursor(undefined);
                    }}
                    aria-pressed={statusFilter === status}
                    className={`min-h-[40px] rounded-xl px-4 py-2 text-sm font-medium transition-colors whitespace-normal sm:text-base ${
                      statusFilter === status
                        ? "bg-[#FF4B26] text-white"
                        : "bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A]"
                    }`}
                  >
                    {t(`transactionHistory.tabs.${status}`)}
                  </button>
                )
              )}
            </div>
          </fieldset>

          {/* Type / Direction Filter */}
          <fieldset className="mb-5">
            <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-3">
              {t("transactionHistory.typeFilterLabel", "Type")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {(["all", "sent", "received"] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => setDirectionFilter(direction)}
                  aria-pressed={directionFilter === direction}
                  className={`min-h-[40px] rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    directionFilter === direction
                      ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/40"
                      : "bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A]"
                  }`}
                >
                  {direction === "all"
                    ? t("transactionHistory.tabs.all")
                    : direction === "sent"
                      ? t("transactionHistory.typeFilter.send")
                      : t("transactionHistory.typeFilter.received")}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Date Range Filter */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-3">
              {t("transactionHistory.dateRange.label")}
            </legend>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="date-from"
                  className="text-xs text-gray-400"
                >
                  {t("transactionHistory.dateRange.from")}
                </label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="min-h-[40px] rounded-xl border border-[#FFFFFF14] bg-[#1A1A1A] px-3 py-2 text-sm text-white focus:border-red-400/40 focus:outline-none focus:ring-1 focus:ring-red-400/40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="date-to"
                  className="text-xs text-gray-400"
                >
                  {t("transactionHistory.dateRange.to")}
                </label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="min-h-[40px] rounded-xl border border-[#FFFFFF14] bg-[#1A1A1A] px-3 py-2 text-sm text-white focus:border-red-400/40 focus:outline-none focus:ring-1 focus:ring-red-400/40"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="min-h-[40px] rounded-xl border border-[#FFFFFF14] px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  aria-label={t("transactionHistory.dateRange.clear")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </fieldset>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#FFFFFF14] pt-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {t("transactionHistory.activeFilters.label")}
              </span>
              {statusFilter !== "all" && (
                <ActivePill
                  label={t("transactionHistory.activeFilters.status").replace(
                    "{{status}}",
                    t(`transactionHistory.tabs.${statusFilter}`)
                  )}
                  onRemove={() => setStatusFilter("all")}
                />
              )}
              {directionFilter !== "all" && (
                <ActivePill
                  label={t("transactionHistory.activeFilters.type").replace(
                    "{{type}}",
                    directionFilter === "sent"
                      ? t("transactionHistory.typeFilter.send")
                      : t("transactionHistory.typeFilter.received")
                  )}
                  onRemove={() => setDirectionFilter("all")}
                />
              )}
              {debouncedSearch.trim().length > 0 && (
                <ActivePill
                  label={t("transactionHistory.activeFilters.search").replace(
                    "{{query}}",
                    debouncedSearch
                  )}
                  onRemove={() => setSearchTerm("")}
                />
              )}
              {(dateFrom || dateTo) && (
                <ActivePill
                  label={`${dateFrom || "..."} - ${dateTo || "..."}`}
                  onRemove={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                />
              )}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-red-400 hover:text-red-300 transition-colors ml-2"
              >
                {t("transactionHistory.activeFilters.clearAll")}
              </button>
            </div>
          )}
        </div>

        {/* Results Count (aria-live) */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {resultsAriaLive}
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => fetchTransactions(undefined, true)}
                className="min-h-[40px] rounded-xl bg-[#FF4B26] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#FF4B26]/80"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <Loader2 className="w-8 h-8 text-[#FF4B26] animate-spin" />
          </div>
        )}

        {/* Empty State (no transactions at all) */}
        {noTransactions && (
          <div className="mt-8">
            <WidgetEmptyState
              icon={Inbox}
              title={t("transactionHistory.emptyState.title")}
              description={t("transactionHistory.emptyState.description")}
              ctaLabel={t("transactionHistory.emptyState.cta")}
              ctaHref="/send"
            />
          </div>
        )}

        {/* No Results State (transactions exist but filters match none) */}
        {noResults && (
          <div className="mt-8">
            <WidgetEmptyState
              icon={SearchX}
              title={t("transactionHistory.noResults.title")}
              description={t("transactionHistory.noResults.description")}
              ctaLabel={t("transactionHistory.noResults.clearFilters")}
              onAction={handleClearFilters}
            />
          </div>
        )}

        {/* Grouped Transactions List */}
        {!isLoading && filteredCount > 0 && (
          <div className="mt-8 space-y-8">
            {(["today", "yesterday", "earlier"] as GroupKey[]).map(
              (groupKey) => {
                const txs = groupedTransactions[groupKey];
                if (txs.length === 0) return null;

                return (
                  <section key={groupKey} aria-labelledby={`group-${groupKey}-heading`}>
                    <div className="mb-3 flex items-center justify-between border-b border-[#FFFFFF14] pb-3">
                      <h2
                        id={`group-${groupKey}-heading`}
                        className="text-base font-semibold text-white"
                      >
                        {groupLabels[groupKey].label}
                      </h2>
                      <span className="text-xs font-medium text-gray-400">
                        {txs.length}{" "}
                        {txs.length === 1
                          ? t("transactionHistory.results_one").replace(
                              "{{count}}",
                              "1"
                            )
                          : t("transactionHistory.results_many").replace(
                              "{{count}}",
                              String(txs.length)
                            )}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {txs.map((tx) => (
                        <TransactionHistoryItem
                          key={tx.hash || tx.id}
                          transaction={tx}
                        />
                      ))}
                    </div>
                  </section>
                );
              }
            )}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !loading && filteredCount > 0 && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="min-h-[48px] rounded-xl bg-[#FF4B26] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#FF4B26]/80 disabled:opacity-50 disabled:cursor-not-allowed sm:text-base"
            >
              {loadingMore
                ? "Loading..."
                : t("transactionHistory.loadMore")}
            </button>
          </div>
        )}

        {/* Loading More Indicator */}
        {loadingMore && filteredCount > 0 && (
          <div className="mt-4 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#FF4B26] animate-spin" />
          </div>
        )}
      </div>
    </main>
  );
};

function ActivePill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#FFFFFF14] bg-white/[0.04] px-3 py-1.5 text-xs text-gray-200">
      <span className="truncate max-w-[200px]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export default TransactionHistoryPage;
