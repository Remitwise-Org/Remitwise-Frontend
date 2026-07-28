"use client";

import { CheckCircle2, ClipboardList, History, Timer, Users, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useWallet } from "stellar-wallet-kit";
import { useClientTranslator } from "@/lib/i18n/client";
import { useToast } from "@/lib/context/ToastContext";
import AsyncSubmissionStatus from "@/components/AsyncSubmissionStatus";
import WidgetEmptyState from "@/components/ui/WidgetEmptyState";
import { useApprovalsQueue, type ApprovalItem, type ApprovalStatus } from "@/lib/hooks/useApprovalsQueue";
import ApprovalRequestCard from "./ApprovalRequestCard";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

/** Statuses that are still awaiting action */
const PENDING_STATUSES: ApprovalStatus[] = ["building", "requested", "pending", "partially_approved", "signing"];

/** Terminal statuses shown in history */
const HISTORY_STATUSES: ApprovalStatus[] = ["approved", "rejected", "expired"];

// ---------------------------------------------------------------------------
// History row — compact read-only representation
// ---------------------------------------------------------------------------

const historyIconClass: Partial<Record<ApprovalStatus, string>> = {
  approved: "text-status-success-fg",
  rejected: "text-status-error-fg",
  expired: "text-gray-500",
};

const historyBadgeClass: Partial<Record<ApprovalStatus, string>> = {
  approved:
    "border-status-success-border bg-status-success-bg text-status-success-fg",
  rejected:
    "border-status-error-border bg-status-error-bg text-status-error-fg",
  expired: "border-white/[0.06] bg-white/[0.02] text-gray-500",
};

const historyLabel: Partial<Record<ApprovalStatus, string>> = {
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

const historyIcon: Partial<Record<ApprovalStatus, React.ElementType>> = {
  approved: CheckCircle2,
  rejected: XCircle,
  expired: Timer,
};

interface HistoryRowProps {
  item: ApprovalItem;
}

function HistoryRow({ item }: HistoryRowProps) {
  const Icon = historyIcon[item.status] ?? CheckCircle2;
  const badge = historyBadgeClass[item.status] ?? "border-white/10 bg-white/[0.03] text-gray-400";
  const iconCls = historyIconClass[item.status] ?? "text-gray-400";
  const label = historyLabel[item.status] ?? item.status;
  const actionLabel = item.action === "add_member" ? "Add member" : "Update limit";

  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <li
      className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.01] px-3 py-3"
      aria-label={`${actionLabel}: ${item.label} — ${label}`}
    >
      {/* Status icon */}
      <div
        className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border ${badge}`}
        aria-hidden="true"
      >
        <Icon className={`h-3.5 w-3.5 ${iconCls}`} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-white">{item.label}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-gray-500">
            {actionLabel}
          </span>
          {item.amount !== undefined && (
            <span className="text-[10px] text-gray-500">{fmt.format(item.amount)}</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
          <span>{date}</span>
          <span>·</span>
          <span>
            {item.collectedSignatures.length}/{item.requiredSignatures} sig
            {item.requiredSignatures !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Status badge */}
      <span
        role="status"
        aria-label={`Status: ${label}`}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badge}`}
      >
        <Icon className={`h-2.5 w-2.5 flex-shrink-0 ${iconCls}`} aria-hidden="true" />
        <span>{label}</span>
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export interface ApprovalsQueueProps {
  /** Injected for testing; defaults to useApprovalsQueue() */
  hook?: ReturnType<typeof useApprovalsQueue>;
}

export default function ApprovalsQueue({ hook }: ApprovalsQueueProps) {
  const { t } = useClientTranslator();
  const { toast } = useToast();
  const { account, isConnected: connected, signTransaction } = useWallet();
  const address = account?.address ?? "";
  const internal = useApprovalsQueue();
  const { queue, signItem, rejectItem, expireStale } = hook ?? internal;

  // Expire stale items on mount and every minute
  const expireRef = useRef(expireStale);
  expireRef.current = expireStale;
  useEffect(() => {
    expireRef.current();
    const id = setInterval(() => expireRef.current(), 60_000);
    return () => clearInterval(id);
  }, []);

  const pendingQueue = queue.filter((i) => PENDING_STATUSES.includes(i.status));
  const historyQueue = queue.filter((i) => HISTORY_STATUSES.includes(i.status));

  const pendingCount = pendingQueue.filter(
    (i) => i.status === "requested" || i.status === "partially_approved" || i.status === "pending"
  ).length;

  const handleApprove = async (id: string) => {
    if (!connected || !address) return;
    const result = await signItem(id, address, (xdr) =>
      signTransaction(xdr, { networkPassphrase: undefined as unknown as string })
        .then((r) => (typeof r === "string" ? r : (r as { signedTxXdr: string }).signedTxXdr))
    );

    if (!result) return;

    if (result.success && result.approved) {
      toast({ variant: "success", title: t("approvals_queue.approved_toast") });
    } else if (result.success) {
      toast({ variant: "success", title: t("approvals_queue.signed_toast") });
    } else {
      toast({
        variant: "error",
        title: t("approvals_queue.sign_failed_toast"),
        description: result.error,
        duration: 0,
      });
    }
  };

  const handleReject = (id: string) => {
    if (!connected || !address) return;
    rejectItem(id, address);
    toast({
      variant: "error",
      title: "Approval rejected",
      description: "The approval request has been rejected.",
    });
  };

  return (
    <section
      aria-label={t("approvals_queue.section_aria")}
      className="rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 sm:p-7"
    >
      {/* ── Header ── */}
      <div className="border-b border-white/[0.08] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
          {t("approvals_queue.eyebrow")}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-white">
            {t("approvals_queue.title")}
          </h2>
          {pendingCount > 0 && (
            <span
              aria-live="polite"
              className="rounded-full border border-status-warning-border bg-status-warning-bg px-3 py-1 text-xs font-semibold text-status-warning-fg"
            >
              {pendingCount} pending
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-300">
          {t("approvals_queue.description")}
        </p>
      </div>

      {/* ── Wallet connection banner ── */}
      {!connected && (
        <div className="mt-5">
          <AsyncSubmissionStatus
            idleTitle={t("approvals_queue.wallet_disconnected_title")}
            idleDescription={t("approvals_queue.wallet_disconnected_desc")}
            pendingTitle=""
            pendingDescription=""
          />
        </div>
      )}

      {/* ── Pending approvals ── */}
      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            Pending approvals
          </p>
        </div>

        {pendingQueue.length === 0 ? (
          <WidgetEmptyState
            icon={Users}
            title={t("approvals_queue.empty_title")}
            description={t("approvals_queue.empty_description")}
          />
        ) : (
          <ol
            className="space-y-3"
            aria-label={t("approvals_queue.list_aria")}
          >
            {pendingQueue.map((item) => (
              <li key={item.id}>
                <ApprovalRequestCard
                  item={item}
                  canAct={connected}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── Approval history ── */}
      {historyQueue.length > 0 && (
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              History
            </p>
          </div>
          <ol
            className="space-y-2"
            aria-label="Approval history"
          >
            {historyQueue.map((item) => (
              <HistoryRow key={item.id} item={item} />
            ))}
          </ol>
        </div>
      )}

      {/* ── Footer note ── */}
      <p className="mt-5 text-xs leading-5 text-gray-500">
        {t("approvals_queue.footer")}
      </p>
    </section>
  );
}

export { useApprovalsQueue };
