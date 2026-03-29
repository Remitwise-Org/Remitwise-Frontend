"use client";

import { AlertCircle, CheckCircle2, Clock3, Loader2 } from "lucide-react";

interface AsyncSubmissionStatusProps {
	pending: boolean;
	error?: string;
	success?: string;
	idleTitle: string;
	idleDescription: string;
	pendingTitle: string;
	pendingDescription: string;
	successTitle?: string;
	successDescription?: string;
	errorTitle?: string;
}

const statusStyles = {
	idle: {
		Icon: Clock3,
		cardClass: "border-white/[0.08] bg-black/20",
		iconClass: "text-gray-300",
		label: "Ready",
		spin: false,
	},
	pending: {
		Icon: Loader2,
		cardClass:
			"border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.18),rgba(16,16,16,0.96))]",
		iconClass: "text-red-200",
		label: "In progress",
		spin: true,
	},
	success: {
		Icon: CheckCircle2,
		cardClass: "border-emerald-500/20 bg-emerald-500/[0.08]",
		iconClass: "text-emerald-300",
		label: "Complete",
		spin: false,
	},
	error: {
		Icon: AlertCircle,
		cardClass: "border-amber-500/20 bg-amber-500/[0.08]",
		iconClass: "text-amber-200",
		label: "Needs attention",
		spin: false,
	},
} as const;

export default function AsyncSubmissionStatus({
	pending,
	error,
	success,
	idleTitle,
	idleDescription,
	pendingTitle,
	pendingDescription,
	successTitle,
	successDescription,
	errorTitle,
}: AsyncSubmissionStatusProps) {
	const status = error ? "error" : success ? "success" : pending ? "pending" : "idle";
	const style = statusStyles[status];
	const Icon = style.Icon;

	const title =
		status === "error"
			? errorTitle ?? "Submission needs attention"
			: status === "success"
				? successTitle ?? "Contract request is ready"
				: status === "pending"
					? pendingTitle
					: idleTitle;

	const description =
		status === "error"
			? error
			: status === "success"
				? successDescription ?? success
				: status === "pending"
					? pendingDescription
					: idleDescription;

	return (
		<div
			aria-live='polite'
			className={`rounded-2xl border p-4 ${style.cardClass}`}>
			<div className='flex items-start gap-3'>
				<div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]'>
					<Icon
						className={`h-4 w-4 ${style.iconClass} ${
							style.spin ? "animate-spin" : ""
						}`}
					/>
				</div>
				<div className='min-w-0'>
					<div className='flex flex-wrap items-center gap-2'>
						<h3 className='text-sm font-semibold text-white'>{title}</h3>
						<span className='rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400'>
							{style.label}
						</span>
					</div>
					<p className='mt-2 text-sm leading-6 text-gray-300'>{description}</p>
				</div>
			</div>
		</div>
	);
}
