"use client";

import React from "react";

export type UtilizationThreshold = "ok" | "near-limit" | "over-limit";

interface UtilizationMeterProps {
	/** Current utilization percentage (0-100+, values over 100 display as over-limit). */
	percentage: number;
	/** Accessible label for the progressbar. Defaults to "Spending utilization". */
	ariaLabel?: string;
	/** Optional label shown above the bar (e.g. "Utilization"). */
	label?: string;
	/** Show the threshold status badge and helper text. Defaults to true. */
	showStatus?: boolean;
	/** Override threshold color classes. */
	thresholdClasses?: Record<UtilizationThreshold, { bar: string; badge: string; text: string }>;
}

const defaultThresholdClasses: Record<UtilizationThreshold, { bar: string; badge: string; text: string }> = {
	"ok": {
		bar: "bg-status-success-fg",
		badge: "border-status-success-border bg-status-success-bg text-status-success-fg",
		text: "text-status-success-fg",
	},
	"near-limit": {
		bar: "bg-status-warning-fg",
		badge: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
		text: "text-status-warning-fg",
	},
	"over-limit": {
		bar: "bg-status-error-fg",
		badge: "border-status-error-border bg-status-error-bg text-status-error-fg",
		text: "text-status-error-fg",
	},
};

const thresholdLabels: Record<UtilizationThreshold, string> = {
	"ok": "On track",
	"near-limit": "Near limit",
	"over-limit": "Over limit",
};

const thresholdHelpers: Record<UtilizationThreshold, (pct: number) => string> = {
	"ok": (pct) => pct === 0 ? "No spending this cycle" : "Spending is within the monthly cap",
	"near-limit": () => "Approaching the monthly cap - review recommended",
	"over-limit": () => "Exceeded the monthly cap - action required",
};

export function getThreshold(percentage: number): UtilizationThreshold {
	if (percentage >= 100) return "over-limit";
	if (percentage >= 75) return "near-limit";
	return "ok";
}

export default function UtilizationMeter({
	percentage,
	ariaLabel = "Spending utilization",
	label,
	showStatus = true,
	thresholdClasses = defaultThresholdClasses,
}: UtilizationMeterProps) {
	const threshold = getThreshold(percentage);
	const classes = thresholdClasses[threshold];
	const displayPct = Math.min(percentage, 100);

	return (
		<div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
			{label && (
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="text-sm font-medium text-white">{label}</p>
					{showStatus && (
						<span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes.badge}`}>
							{thresholdLabels[threshold]}
						</span>
					)}
				</div>
			)}
			{!label && showStatus && (
				<div className="flex items-center justify-end">
					<span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes.badge}`}>
						{thresholdLabels[threshold]}
					</span>
				</div>
			)}

			<div
				className={`${label ? "mt-3" : ""} h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]`}
				role="progressbar"
				aria-valuenow={displayPct}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={ariaLabel}
			>
				<div
					className={`h-full rounded-full transition-all duration-500 ${classes.bar}`}
					style={{ width: `${displayPct}%` }}
				/>
			</div>

			<div className="mt-2 flex items-center justify-between text-xs text-gray-500">
				<span>0%</span>
				<span className={`font-medium ${classes.text}`}>{percentage}%</span>
				<span>100%</span>
			</div>

			{showStatus && (
				<p className={`mt-2 text-xs leading-5 ${classes.text}`}>
					{thresholdHelpers[threshold](percentage)}
				</p>
			)}
		</div>
	);
}
