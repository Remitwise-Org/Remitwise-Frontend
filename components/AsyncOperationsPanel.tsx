"use client";

import {
	ArrowUpRight,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock3,
	Loader2,
	ShieldCheck,
	Wallet,
	type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAsyncOperations, OperationStatus } from "@/lib/context/AsyncOperationsContext";

type AsyncStage = {
	label: string;
	duration: string;
	detail: string;
	placement: string;
	icon?: LucideIcon;
};

type QueueItem = {
	title: string;
	duration: string;
	detail: string;
	status: "active" | "queued" | "complete" | "failed";
};

interface AsyncOperationsPanelProps {
	eyebrow: string;
	title: string;
	description: string;
	stages: AsyncStage[];
	queueTitle: string;
	queueDescription: string;
	queueItems?: QueueItem[]; // Optional now
	footer?: string;
}

const queueStatusStyles = {
	active: {
		badge: "Live now",
		cardClass:
			"border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.22),rgba(18,18,18,0.96))]",
		iconClass: "text-red-300",
		Icon: Loader2,
		spin: true,
	},
	queued: {
		badge: "Queued",
		cardClass: "border-white/10 bg-[#111111]",
		iconClass: "text-amber-200",
		Icon: Clock3,
		spin: false,
	},
	complete: {
		badge: "Confirmed",
		cardClass: "border-emerald-500/20 bg-emerald-500/[0.08]",
		iconClass: "text-emerald-300",
		Icon: CheckCircle2,
		spin: false,
	},
	failed: {
		badge: "Failed",
		cardClass: "border-amber-500/20 bg-amber-500/[0.06]",
		iconClass: "text-amber-200",
		Icon: Clock3,
		spin: false,
	},
} as const;

const mapStatus = (status: OperationStatus): QueueItem['status'] => {
	switch (status) {
		case 'building':
		case 'awaiting-signature':
		case 'submitting':
			return 'active';
		case 'confirmed':
			return 'complete';
		case 'failed':
			return 'failed';
		default:
			return 'queued';
	}
};

export default function AsyncOperationsPanel({
	eyebrow,
	title,
	description,
	stages,
	queueTitle,
	queueDescription,
	queueItems: propQueueItems = [],
	footer,
}: AsyncOperationsPanelProps) {
	const { state } = useAsyncOperations();
	const [expanded, setExpanded] = useState(false);
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	const queueItems = useMemo(() => {
		if (state.operations.length > 0) {
			return state.operations.map(op => ({
				title: op.title,
				duration: 'Just now', 
				detail: op.detail,
				status: mapStatus(op.status),
			}));
		}
		return propQueueItems;
	}, [state.operations, propQueueItems]);

	const activeIndex = useMemo(() => queueItems.findIndex((i) => i.status === "active"), [queueItems]);

	useEffect(() => {
		// Close open detail if item list changes and index no longer valid
		if (openIndex !== null && openIndex >= queueItems.length) setOpenIndex(null);
	}, [queueItems, openIndex]);

	// Live announcement for major state: active started/completed/failed
	const [liveText, setLiveText] = useState("");
	useEffect(() => {
		const active = queueItems[activeIndex];
		if (active) setLiveText(`${active.title} ${active.status}`);
	}, [queueItems, activeIndex]);
	return (
		<section className='rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 sm:p-7'>
			<div className='border-b border-white/[0.08] pb-5'>
				<p className='text-xs font-semibold uppercase tracking-[0.24em] text-red-300'>
					{eyebrow}
				</p>
				<h2 className='mt-3 text-2xl font-semibold text-white'>{title}</h2>
				<p className='mt-2 text-sm leading-6 text-gray-300'>{description}</p>
			</div>

			<div className='mt-6 space-y-3'>
				{stages.map((stage, index) => {
					const StageIcon = stage.icon ?? (index < 2 ? ShieldCheck : Wallet);

					return (
						<article
							key={stage.label}
							className='rounded-2xl border border-white/[0.08] bg-black/20 p-4'>
							<div className='flex items-start justify-between gap-4'>
								<div className='flex items-start gap-3'>
									<div className='flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-red-300'>
										<StageIcon className='h-4 w-4' />
									</div>
									<div>
										<div className='flex flex-wrap items-center gap-2'>
											<h3 className='text-sm font-semibold text-white'>
												{index + 1}. {stage.label}
											</h3>
											<span className='rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400'>
												{stage.duration}
											</span>
										</div>
										<p className='mt-2 text-sm leading-6 text-gray-300'>
											{stage.detail}
										</p>
									</div>
								</div>
								<span className='hidden rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-100 sm:inline-flex'>
									{stage.placement}
								</span>
							</div>
							<p className='mt-3 text-xs uppercase tracking-[0.16em] text-gray-500 sm:hidden'>
								{stage.placement}
							</p>
						</article>
					);
				})}
			</div>

			{/* Queue: compact rail on desktop, inline on mobile */}
			<div className='mt-6'>
				<div className='flex items-start justify-between gap-3'>
					<div>
						<h3 className='text-sm font-semibold text-white'>{queueTitle}</h3>
						<p className='mt-1 text-sm leading-6 text-gray-300'>
							{queueDescription}
						</p>
					</div>
					<div className='flex items-center gap-2'>
						<span className='hidden sm:inline-flex text-xs text-gray-400'>{queueItems.length} total</span>
						<button
							aria-expanded={expanded}
							aria-controls='ops-panel'
							onClick={() => setExpanded((s) => !s)}
							className='inline-flex items-center gap-2 rounded-md bg-white/[0.02] px-2 py-1 text-xs text-gray-300 hover:bg-white/[0.04]'>
							{expanded ? (
								<ChevronUp className='h-4 w-4' />
							) : (
								<ChevronDown className='h-4 w-4' />
							)}
							<span className='sr-only'>Toggle operations panel</span>
						</button>
					</div>
				</div>

				<div id='ops-panel' className={`mt-4 space-y-3 ${expanded ? "" : "max-h-[220px] overflow-hidden"}`}>
					{queueItems.map((item, index) => {
						const statusConfig = queueStatusStyles[item.status] ?? queueStatusStyles.queued;
						const StatusIcon = statusConfig.Icon;
						const isActive = item.status === "active";
						const isOpen = openIndex === index;

						return (
							<article
								key={`${item.title}-${item.status}-${index}`}
								className={`group relative flex flex-col rounded-2xl border p-3 ${statusConfig.cardClass} ${isActive ? "ring-2 ring-blue-400/20 shadow-md" : ""}`}>
								<div className='flex items-center justify-between gap-3'>
									<div className='flex items-center gap-3 min-w-0'>
										<div className={`flex h-8 w-8 items-center justify-center rounded-md border border-white/8 bg-white/[0.03] ${isActive ? "animate-pulse" : ""}`}>
											<StatusIcon className={`h-4 w-4 ${statusConfig.iconClass}`} />
										</div>
										<div className='min-w-0'>
											<div className='flex items-center gap-2'>
												<h4 className='truncate text-sm font-semibold text-white'>
													{item.title}
												</h4>
												<span className='hidden md:inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400'>
													{statusConfig.badge}
												</span>
											</div>
											<p className='mt-1 truncate text-xs text-gray-300'>{item.detail}</p>
										</div>
									</div>

									<div className='flex items-center gap-2'>
										<span className='text-xs text-gray-300'>{item.duration}</span>
										<button
											aria-expanded={isOpen}
											aria-controls={`op-${index}`}
											onClick={() => setOpenIndex(isOpen ? null : index)}
											className='ml-2 inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:bg-white/[0.02]'>
											{isOpen ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
										</button>
									</div>
								</div>

								{isOpen ? (
									<div id={`op-${index}`} className='mt-3 border-t border-white/[0.04] pt-3 text-sm text-gray-300'>
										<p>{item.detail}</p>
										<div className='mt-2 flex gap-2'>
											{item.status === 'failed' ? (
												<button className='rounded-md bg-amber-500/10 px-3 py-1 text-amber-200'>Retry</button>
											) : null}
											<a className='text-sm text-blue-400 hover:underline' href='#'>View details</a>
										</div>
									</div>
								) : null}
							</article>
						);
					})}
				</div>
				<div aria-hidden className='sr-only' aria-live='polite'>{liveText}</div>
			</div>

			{footer ? (
				<p className='mt-4 text-xs leading-5 text-gray-500'>{footer}</p>
			) : null}
		</section>
	);
}
