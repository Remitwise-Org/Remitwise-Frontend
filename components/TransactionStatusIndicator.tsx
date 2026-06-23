 "use client";

import { AlertCircle, CheckCircle2, Clock3, HelpCircle, Loader2 } from "lucide-react";
import {
  getSemanticTonePresentation,
  type SemanticStatusPresentation,
} from "@/lib/ui/status-semantics";
import { useClientTranslator } from "@/lib/i18n/client";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import {
  useTransactionStatus,
  type TransactionLifecycleStatus,
  type UseTransactionStatusOptions,
} from "@/lib/hooks/useTransactionStatus";

type DisplayStatus = Exclude<TransactionLifecycleStatus, "idle">;

/**
 * Maps a lifecycle status to a shared status-semantics presentation. No new tone
 * system — this reuses `lib/ui/status-semantics.ts` so colours stay consistent
 * with bills/insurance.
 */
function getPresentation(
  status: DisplayStatus,
  label: string,
  emphasis: string,
): SemanticStatusPresentation {
  switch (status) {
    case "confirmed":
      return getSemanticTonePresentation("success", { label, emphasis, icon: CheckCircle2 });
    case "failed":
      return getSemanticTonePresentation("error", { label, emphasis, icon: AlertCircle });
    case "unknown":
      return getSemanticTonePresentation("info", { label, emphasis, icon: HelpCircle });
    case "pending":
    default:
      return getSemanticTonePresentation("warning", { label, emphasis, icon: Clock3 });
  }
}

export interface TransactionStatusIndicatorProps {
  /** Hash to poll live. When omitted, the indicator is controlled via `status`. */
  txHash?: string | null;
  /** Controlled lifecycle status (used when not polling, e.g. history rows). */
  status?: DisplayStatus;
  /** Poll the live status endpoint. Default true when a `txHash` is provided. */
  live?: boolean;
  /** Backoff / attempt overrides forwarded to {@link useTransactionStatus}. */
  pollOptions?: UseTransactionStatusOptions;
  /** Compact rendering for dense lists. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Live (or controlled) transaction-status pill.
 *
 * - Polls to a terminal state when given a `txHash` (live mode).
 * - Announces changes via an `aria-live` region for screen readers.
 * - Honours `prefers-reduced-motion`: the pending spinner becomes a static icon.
 */
export default function TransactionStatusIndicator({
  txHash,
  status: controlledStatus,
  live,
  pollOptions,
  size = "md",
  className = "",
}: TransactionStatusIndicatorProps) {
  const { t } = useClientTranslator();
  const prefersReducedMotion = usePrefersReducedMotion();

  const shouldPoll = Boolean(txHash) && live !== false;
  const polled = useTransactionStatus(shouldPoll ? txHash : null, pollOptions);

  // Live status wins when polling; otherwise fall back to the controlled prop.
  const effective: DisplayStatus = shouldPoll
    ? polled.status === "idle"
      ? "pending"
      : polled.status
    : controlledStatus ?? "pending";

  const label = t(`transactionStatus.${effective}.label`);
  const emphasis = t(`transactionStatus.${effective}.emphasis`);
  const presentation = getPresentation(effective, label, emphasis);
  const Icon = presentation.icon;

  const isPending = effective === "pending";
  const showSpinner = isPending && !prefersReducedMotion;

  const padding = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <span
      role="status"
      aria-live="polite"
      data-status={effective}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${padding} ${presentation.badgeClassName} ${className}`}
    >
      {showSpinner ? (
        <Loader2 className={`${iconSize} animate-spin`} aria-hidden="true" />
      ) : (
        <Icon className={iconSize} aria-hidden="true" />
      )}
      <span>{label}</span>
      {/* Screen-reader-only longer announcement of the change. */}
      <span className="sr-only">{emphasis}</span>
    </span>
  );
}
