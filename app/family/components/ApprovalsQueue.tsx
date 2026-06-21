"use client";

import { CheckCircle2, Clock3, Loader2, PenLine, Users, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useWallet } from "stellar-wallet-kit";
import { useClientTranslator } from "@/lib/i18n/client";
import AsyncSubmissionStatus from "@/components/AsyncSubmissionStatus";
import WidgetEmptyState from "@/components/ui/WidgetEmptyState";
import WidgetErrorState from "@/components/ui/WidgetErrorState";
import { useApprovalsQueue, type ApprovalItem, type ApprovalStatus } from "@/lib/hooks/useApprovalsQueue";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusIcon: Record<ApprovalStatus, React.ElementType> = {
  building: Loader2,
  pending: Clock3,
  signing: Loader2,
  approved: CheckCircle2,
  expired: XCircle,
};

const statusCardClass: Record<ApprovalStatus, string> = {
  building: "border-white/10 bg-white/[0.02]",
  pending: "border-amber-500/20 bg-amber-500/[0.05]",
  signing: "border-red-500/20 bg-red-500/[0.06]",
  approved: "border-emerald-500/20 bg-emerald-500/[0.07]",
  expired: "border-white/[0.06] bg-white/[0.01] opacity-60",
};

const statusIconClass: Record<ApprovalStatus, string> = {
  building: "text-gray-400 animate-spin",
  pending: "text-amber-300",
  signing: "text-red-300 animate-spin",
  approved: "text-emerald-300",
  expired: "text-gray-500",
};

// ---------------------------------------------------------------------------
// Single queue item row
// ---------------------------------------------------------------------------

interface QueueItemRowProps {
  item: ApprovalItem;
  onSign: (id: string) => void;
  canSign: boolean;
  t: (key: string, opts?: string | Record<string, unknown>) => string;
}

function QueueItemRow({ item, onSign, canSign, t }: QueueItemRowProps) {
  const Icon = statusIcon[item.status];
  const cardClass = statusCardClass[item.status];
  const iconClass = statusIconClass[item.status];
  const isPending = item.status === "pending";
  const isSigning = item.status === "signing";

  const sigRatio = `${item.collectedSignatures.length}/${item.requiredSignatures}`;
  const actionLabel = item.action === "add_member"
    ? t("approvals_queue.action_add_member")
    : t("approvals_queue.action_update_limit");

  return (
    <article
      className={`rounded-2xl border p-4 transition-colors ${cardClass}`}
      aria-label={`${actionLabel}: ${item.label}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">{item.label}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-gray-400">
              {actionLabel}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span>
              {t("approvals_queue.signatures_label")}: {sigRatio}
            </span>
            <span aria-label={t("approvals_queue.status_aria", { status: item.status })}>
              {t(`approvals_queue.status_${item.status}`)}
            </span>
          </div>

          {item.error && (
            <p className="mt-1 text-xs text-red-300" role="alert">
              {item.error}
            </p>
          )}
        </div>

        {(isPending || isSigning) && canSign && (
          <button
            type="button"
            disabled={isSigning || !item.xdr}
            onClick={() => onSign(item.id)}
            aria-label={t("approvals_queue.sign_aria", { label: item.label })}
            className="flex-shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSigning ? t("approvals_queue.signing") : t("approvals_queue.sign")}
          </button>
        )}
      </div>
    </article>
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
  const { account, isConnected: connected, signTransaction } = useWallet();
  const address = account?.address ?? "";
  const internal = useApprovalsQueue();
  const { queue, signItem, expireStale } = hook ?? internal;

  // Expire stale items on mount and every minute
  const expireRef = useRef(expireStale);
  expireRef.current = expireStale;
  useEffect(() => {
    expireRef.current();
    const id = setInterval(() => expireRef.current(), 60_000);
    return () => clearInterval(id);
  }, []);

  const visibleQueue = queue.filter((i) => i.status !== "expired");

  const handleSign = async (id: string) => {
    if (!connected || !address) return;
    await signItem(id, address, (xdr) =>
      // Route through the wallet-kit's signTransaction — no new primitive
      signTransaction(xdr, { networkPassphrase: undefined as unknown as string })
        .then((r) => (typeof r === "string" ? r : (r as { signedTxXdr: string }).signedTxXdr))
    );
  };

  const pendingCount = visibleQueue.filter((i) => i.status === "pending").length;

  return (
    <section
      aria-label={t("approvals_queue.section_aria")}
      className="rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 sm:p-7"
    >
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
          {t("approvals_queue.eyebrow")}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-white">
            {t("approvals_queue.title")}
          </h2>
          {pendingCount > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
              {t("approvals_queue.pending_badge", { count: pendingCount })}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-300">
          {t("approvals_queue.description")}
        </p>
      </div>

      {/* Wallet connection status banner */}
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

      {/* Queue list */}
      <div className="mt-5">
        {visibleQueue.length === 0 ? (
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
            {visibleQueue.map((item) => (
              <li key={item.id}>
                <QueueItemRow
                  item={item}
                  onSign={handleSign}
                  canSign={connected}
                  t={t}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Footer note */}
      <p className="mt-5 text-xs leading-5 text-gray-500">
        {t("approvals_queue.footer")}
      </p>
    </section>
  );
}

export { useApprovalsQueue };
