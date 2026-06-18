"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CircleDollarSign,
  Download,
  FileText,
  FilterIcon,
  GitBranch,
  Info,
  Search,
  Send,
  Shield,
  X,
} from "lucide-react";
import TransactionHistoryItem, {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "@/components/Dashboard/TransactionHistoryItem";
import { useDensity } from "@/lib/context/DensityContext";

const allTransactions: Transaction[] = [
  {
    id: "TX001",
    type: "Send Money",
    amount: -500.0,
    currency: "USDC",
    counterpartyName: "Maria Santos (Philippines)",
    counterpartyLabel: "To",
    date: "2026-06-02 14:32:15",
    fee: 0.5,
    status: "Completed",
  },
  {
    id: "TX002",
    type: "Smart Split",
    amount: -1200.0,
    currency: "USDC",
    counterpartyName: "Smart Split: 4 allocations",
    counterpartyLabel: "To",
    date: "2026-06-02 09:15:42",
    fee: 0.3,
    status: "Completed",
  },
  {
    id: "TX003",
    type: "Bill Payment",
    amount: -85.5,
    currency: "USDC",
    counterpartyName: "Manila Electric Company",
    counterpartyLabel: "To",
    date: "2026-05-31 16:45:23",
    fee: 0.1,
    status: "Completed",
  },
  {
    id: "TX004",
    type: "Insurance",
    amount: -25.0,
    currency: "USDC",
    counterpartyName: "HealthGuard Insurance Premium",
    counterpartyLabel: "To",
    date: "2026-05-30 11:20:05",
    fee: 0.05,
    status: "Completed",
  },
  {
    id: "TX005",
    type: "Savings",
    amount: -200.0,
    currency: "USDC",
    counterpartyName: "Education Fund Goal",
    counterpartyLabel: "To",
    date: "2026-05-29 08:55:17",
    fee: 0.1,
    status: "Completed",
  },
  {
    id: "TX006",
    type: "Family Transfer",
    amount: -150.0,
    currency: "USDC",
    counterpartyName: "Carlos Santos (Son)",
    counterpartyLabel: "To",
    date: "2026-05-27 19:30:44",
    fee: 0.15,
    status: "Completed",
  },
  {
    id: "TX007",
    type: "Received",
    amount: 75.0,
    currency: "USDC",
    counterpartyName: "Refund from LOBSTR Anchor",
    counterpartyLabel: "From",
    date: "2026-05-22 13:15:30",
    fee: 0.0,
    status: "Completed",
  },
  {
    id: "TX008",
    type: "Send Money",
    amount: -320.0,
    currency: "USDC",
    counterpartyName: "Juan Dela Cruz (Philippines)",
    counterpartyLabel: "To",
    date: "2026-05-18 10:42:18",
    fee: 0.4,
    status: "Pending",
  },
  {
    id: "TX009",
    type: "Bill Payment",
    amount: -120.0,
    currency: "USDC",
    counterpartyName: "Water District Payment",
    counterpartyLabel: "To",
    date: "2026-05-14 15:22:55",
    fee: 0.0,
    status: "Failed",
  },
  {
    id: "TX010",
    type: "Smart Split",
    amount: -800.0,
    currency: "USDC",
    counterpartyName: "Smart Split: 4 allocations",
    counterpartyLabel: "To",
    date: "2026-05-09 12:08:33",
    fee: 0.25,
    status: "Completed",
  },
];

const primaryTypeOptions: TransactionType[] = [
  "Send Money",
  "Smart Split",
  "Bill Payment",
  "Insurance",
];

const secondaryTypeOptions: TransactionType[] = [
  "Savings",
  "Family Transfer",
  "Received",
];

const statusOptions: TransactionStatus[] = ["Completed", "Pending", "Failed"];

const typeStyles: Record<
  TransactionType,
  {
    border: string;
    icon: JSX.Element;
    label: string;
    selected: string;
    subtle: string;
  }
> = {
  "Send Money": {
    border: "border-sky-400/30",
    icon: <Send className="h-4 w-4" />,
    label: "Send",
    selected: "bg-sky-500/20 text-sky-100 ring-sky-400/40",
    subtle: "bg-sky-500/10 text-sky-200",
  },
  "Smart Split": {
    border: "border-violet-400/30",
    icon: <GitBranch className="h-4 w-4" />,
    label: "Split",
    selected: "bg-violet-500/20 text-violet-100 ring-violet-400/40",
    subtle: "bg-violet-500/10 text-violet-200",
  },
  "Bill Payment": {
    border: "border-amber-400/30",
    icon: <FileText className="h-4 w-4" />,
    label: "Bills",
    selected: "bg-amber-500/20 text-amber-100 ring-amber-400/40",
    subtle: "bg-amber-500/10 text-amber-200",
  },
  Insurance: {
    border: "border-emerald-400/30",
    icon: <Shield className="h-4 w-4" />,
    label: "Insurance",
    selected: "bg-emerald-500/20 text-emerald-100 ring-emerald-400/40",
    subtle: "bg-emerald-500/10 text-emerald-200",
  },
  Savings: {
    border: "border-lime-400/30",
    icon: <CircleDollarSign className="h-4 w-4" />,
    label: "Savings",
    selected: "bg-lime-500/20 text-lime-100 ring-lime-400/40",
    subtle: "bg-lime-500/10 text-lime-200",
  },
  "Family Transfer": {
    border: "border-cyan-400/30",
    icon: <Send className="h-4 w-4" />,
    label: "Family",
    selected: "bg-cyan-500/20 text-cyan-100 ring-cyan-400/40",
    subtle: "bg-cyan-500/10 text-cyan-200",
  },
  Received: {
    border: "border-fuchsia-400/30",
    icon: <Download className="h-4 w-4" />,
    label: "Received",
    selected: "bg-fuchsia-500/20 text-fuchsia-100 ring-fuchsia-400/40",
    subtle: "bg-fuchsia-500/10 text-fuchsia-200",
  },
};

const statusStyles: Record<
  TransactionStatus,
  { label: string; selected: string; subtle: string }
> = {
  Completed: {
    label: "Completed",
    selected: "bg-emerald-500/20 text-emerald-100 ring-emerald-400/40",
    subtle: "bg-emerald-500/10 text-emerald-200",
  },
  Pending: {
    label: "Pending",
    selected: "bg-amber-500/20 text-amber-100 ring-amber-400/40",
    subtle: "bg-amber-500/10 text-amber-200",
  },
  Failed: {
    label: "Failed",
    selected: "bg-rose-500/20 text-rose-100 ring-rose-400/40",
    subtle: "bg-rose-500/10 text-rose-200",
  },
};

type GroupKey = "today" | "this-week" | "earlier";

const groupLabels: Record<GroupKey, { label: string; helper: string }> = {
  today: {
    label: "Today",
    helper: "Transactions from the latest activity day",
  },
  "this-week": {
    label: "This Week",
    helper: "Activity within 7 days of the latest transaction",
  },
  earlier: {
    label: "Earlier",
    helper: "Older activity kept in chronological order",
  },
};

function parseTransactionDate(date: string) {
  return new Date(date.replace(" ", "T"));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getLatestTransactionDate(transactions: Transaction[]) {
  return transactions.reduce((latest, transaction) => {
    const transactionDate = parseTransactionDate(transaction.date);
    return transactionDate > latest ? transactionDate : latest;
  }, parseTransactionDate(transactions[0]?.date ?? "2026-06-02 00:00:00"));
}

function getGroupKey(transaction: Transaction, referenceDate: Date): GroupKey {
  const transactionDay = startOfDay(parseTransactionDate(transaction.date));
  const referenceDay = startOfDay(referenceDate);
  const dayDifference =
    (referenceDay.getTime() - transactionDay.getTime()) / (1000 * 60 * 60 * 24);

  if (dayDifference === 0) return "today";
  if (dayDifference > 0 && dayDifference <= 7) return "this-week";
  return "earlier";
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseTransactionDate(date));
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export default function TransactionsPage() {
  const { density } = useDensity();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<TransactionStatus[]>([]);

  const referenceDate = useMemo(
    () => getLatestTransactionDate(allTransactions),
    []
  );

  const filteredTransactions = useMemo(() => {
    const query = normalizeQuery(searchQuery);

    return allTransactions.filter((transaction) => {
      const searchableText = [
        transaction.id,
        transaction.counterpartyName,
        transaction.type,
        transaction.status,
        transaction.amount.toString(),
        transaction.currency,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = query.length === 0 || searchableText.includes(query);
      const matchesType =
        selectedTypes.length === 0 || selectedTypes.includes(transaction.type);
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(transaction.status);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, selectedStatuses, selectedTypes]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<GroupKey, Transaction[]> = {
      today: [],
      "this-week": [],
      earlier: [],
    };

    filteredTransactions.forEach((transaction) => {
      groups[getGroupKey(transaction, referenceDate)].push(transaction);
    });

    return groups;
  }, [filteredTransactions, referenceDate]);

  const activeFilterCount =
    selectedTypes.length +
    selectedStatuses.length +
    (normalizeQuery(searchQuery).length > 0 ? 1 : 0);

  const hasTransactions = allTransactions.length > 0;
  const hasNoResults = hasTransactions && filteredTransactions.length === 0;

  const toggleType = (type: TransactionType) => {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((selectedType) => selectedType !== type)
        : [...current, type]
    );
  };

  const toggleStatus = (status: TransactionStatus) => {
    setSelectedStatuses((current) =>
      current.includes(status)
        ? current.filter((selectedStatus) => selectedStatus !== status)
        : [...current, status]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedTypes([]);
    setSelectedStatuses([]);
  };

  const handleExportClick = () => {
    const rows = filteredTransactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      counterparty: transaction.counterpartyName,
      date: transaction.date,
      fee: transaction.fee,
    }));

    const csv = [
      Object.keys(rows[0] ?? {}).join(","),
      ...rows.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "remitwise-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#010101]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-300">
                Transaction history
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                USDC activity
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Search, filter, and review payment, split, bill, and insurance
                activity with grouped results by date.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportClick}
              disabled={filteredTransactions.length === 0}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-gray-500"
            >
              <Download className="h-4 w-4" />
              Export current view
            </button>
          </div>

          <section
            className="mt-8 rounded-2xl border border-white/10 bg-[#080808] p-4 sm:p-5"
            aria-labelledby="transaction-filters-heading"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <FilterIcon className="h-4 w-4 text-red-300" />
                  <h2
                    id="transaction-filters-heading"
                    className="text-sm font-semibold text-white"
                  >
                    Filter transactions
                  </h2>
                </div>
                <label className="relative block">
                  <span className="sr-only">Search transactions</span>
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="min-h-[48px] w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-12 pr-12 text-sm text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="Search ID, recipient, type, status, amount"
                    aria-describedby="transaction-results-count"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                      aria-label="Clear transaction search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </label>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-gray-300 lg:w-72">
                <div
                  id="transaction-results-count"
                  className="font-medium text-white"
                  aria-live="polite"
                >
                  Showing {filteredTransactions.length} of{" "}
                  {allTransactions.length} transactions
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Search combines with every selected type and status chip.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Type
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  <FilterChip
                    label="All types"
                    selected={selectedTypes.length === 0}
                    onClick={() => setSelectedTypes([])}
                  />
                  {primaryTypeOptions.map((type) => (
                    <FilterChip
                      key={type}
                      label={typeStyles[type].label}
                      icon={typeStyles[type].icon}
                      selected={selectedTypes.includes(type)}
                      tone={typeStyles[type]}
                      onClick={() => toggleType(type)}
                    />
                  ))}
                  {secondaryTypeOptions.map((type) => (
                    <FilterChip
                      key={type}
                      label={typeStyles[type].label}
                      icon={typeStyles[type].icon}
                      selected={selectedTypes.includes(type)}
                      tone={typeStyles[type]}
                      onClick={() => toggleType(type)}
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Status
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  <FilterChip
                    label="All statuses"
                    selected={selectedStatuses.length === 0}
                    onClick={() => setSelectedStatuses([])}
                  />
                  {statusOptions.map((status) => (
                    <FilterChip
                      key={status}
                      label={statusStyles[status].label}
                      selected={selectedStatuses.includes(status)}
                      tone={statusStyles[status]}
                      onClick={() => toggleStatus(status)}
                    />
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Active
                </span>
                {activeFilterCount === 0 ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400">
                    No filters applied
                  </span>
                ) : (
                  <>
                    {normalizeQuery(searchQuery).length > 0 && (
                      <ActivePill
                        label={`Search: ${searchQuery}`}
                        onRemove={() => setSearchQuery("")}
                      />
                    )}
                    {selectedTypes.map((type) => (
                      <ActivePill
                        key={type}
                        label={`Type: ${type}`}
                        onRemove={() => toggleType(type)}
                      />
                    ))}
                    {selectedStatuses.map((status) => (
                      <ActivePill
                        key={status}
                        label={`Status: ${status}`}
                        onRemove={() => toggleStatus(status)}
                      />
                    ))}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-gray-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-transparent"
              >
                Clear all
              </button>
            </div>
          </section>

          <div className="mt-8">
            {!hasTransactions && (
              <StateCard
                title="No transaction history yet"
                body="Completed transfers, splits, bill payments, and insurance activity will appear here once you make your first transaction."
              />
            )}

            {hasNoResults && (
              <StateCard
                title="No matching transactions"
                body="Try clearing a chip, widening the status selection, or searching by recipient, ID, amount, or transaction type."
                actionLabel="Clear filters"
                onAction={clearAllFilters}
              />
            )}

            {filteredTransactions.length > 0 && (
              <div className={density === "compact" ? "space-y-7" : "space-y-8"}>
                {(["today", "this-week", "earlier"] as GroupKey[]).map(
                  (groupKey) => {
                    const transactions = groupedTransactions[groupKey];
                    if (transactions.length === 0) return null;

                    return (
                      <section key={groupKey} aria-labelledby={`${groupKey}-heading`}>
                        <div className="mb-3 flex flex-col gap-1 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <h2
                              id={`${groupKey}-heading`}
                              className="text-base font-semibold text-white"
                            >
                              {groupLabels[groupKey].label}
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                              {groupLabels[groupKey].helper}
                            </p>
                          </div>
                          <p className="text-xs font-medium text-gray-400">
                            {transactions.length}{" "}
                            {transactions.length === 1 ? "result" : "results"}
                          </p>
                        </div>
                        <div
                          className={
                            density === "compact" ? "space-y-2" : "space-y-4"
                          }
                        >
                          {transactions.map((transaction) => (
                            <div key={transaction.id} className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-gray-500">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${typeStyles[transaction.type].border} ${typeStyles[transaction.type].subtle}`}
                                >
                                  {typeStyles[transaction.type].icon}
                                  {transaction.type}
                                </span>
                                <span>{formatShortDate(transaction.date)}</span>
                              </div>
                              <TransactionHistoryItem
                                transaction={transaction}
                                density={density}
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function FilterChip({
  icon,
  label,
  onClick,
  selected,
  tone,
}: {
  icon?: JSX.Element;
  label: string;
  onClick: () => void;
  selected: boolean;
  tone?: { border?: string; selected?: string; subtle?: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${
        selected
          ? `${tone?.selected ?? "bg-white/15 text-white ring-white/20"} ${
              tone?.border ?? "border-white/20"
            } ring-1`
          : `${tone?.subtle ?? "bg-white/[0.03] text-gray-300"} ${
              tone?.border ?? "border-white/10"
            } hover:bg-white/10 hover:text-white`
      }`}
    >
      {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {icon}
      {label}
    </button>
  );
}

function ActivePill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-gray-200">
      <span className="truncate">{label}</span>
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

function StateCard({
  actionLabel,
  body,
  onAction,
  title,
}: {
  actionLabel?: string;
  body: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-10 text-center sm:px-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-200">
        <Info className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
        {body}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
