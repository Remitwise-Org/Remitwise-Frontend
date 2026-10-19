import { AlertCircle, CheckCircle2, Clock3, Loader2, type LucideIcon } from "lucide-react";

/**
 * Shared status semantics for the async contract-progress UI
 * (AsyncOperationsPanel + AsyncSubmissionStatus). Keeping one source of
 * truth for color/icon/copy per status keeps the Split and Bills pages
 * visually consistent, per docs/async-contract-submissions-handoff.md.
 */
export type AsyncStatusToken = "active" | "queued" | "complete" | "failed";

export interface AsyncStatusVisual {
	token: AsyncStatusToken;
	/** Short badge copy, e.g. "Live now". */
	badge: string;
	cardClass: string;
	iconWrapClass: string;
	iconClass: string;
	dotClass: string;
	Icon: LucideIcon;
	spin: boolean;
}

export const ASYNC_STATUS_VISUALS: Record<AsyncStatusToken, AsyncStatusVisual> = {
	active: {
		token: "active",
		badge: "Live now",
		cardClass:
			"border-red-500/25 bg-[linear-gradient(180deg,rgba(127,29,29,0.28),rgba(12,12,12,0.98))]",
		iconWrapClass: "border-red-400/30 bg-red-500/10",
		iconClass: "text-red-300",
		dotClass: "bg-red-400",
		Icon: Loader2,
		spin: true,
	},
	queued: {
		token: "queued",
		badge: "Queued",
		cardClass: "border-white/10 bg-white/[0.02]",
		iconWrapClass: "border-white/10 bg-white/[0.03]",
		iconClass: "text-amber-200",
		dotClass: "bg-amber-300",
		Icon: Clock3,
		spin: false,
	},
	complete: {
		token: "complete",
		badge: "Confirmed",
		cardClass: "border-emerald-500/20 bg-emerald-500/[0.06]",
		iconWrapClass: "border-emerald-400/20 bg-emerald-500/10",
		iconClass: "text-emerald-300",
		dotClass: "bg-emerald-400",
		Icon: CheckCircle2,
		spin: false,
	},
	failed: {
		token: "failed",
		badge: "Failed",
		cardClass: "border-amber-500/30 bg-amber-500/[0.08]",
		iconWrapClass: "border-amber-400/25 bg-amber-500/10",
		iconClass: "text-amber-200",
		dotClass: "bg-amber-400",
		Icon: AlertCircle,
		spin: false,
	},
};

/** Maps AsyncSubmissionStatus's idle/pending/success/error onto the same token language. */
export const SUBMISSION_TO_ASYNC_TOKEN: Record<
	"idle" | "pending" | "success" | "error",
	AsyncStatusToken
> = {
	idle: "queued",
	pending: "active",
	success: "complete",
	error: "failed",
};
