"use client";

import { ChevronDown, ChevronUp, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAsyncOperations, OperationStatus } from "@/lib/context/AsyncOperationsContext";
import { ASYNC_STATUS_VISUALS, type AsyncStatusToken } from "@/lib/asyncStatusTokens";

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
	status: AsyncStatusToken;
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

const mapStatus = (status: OperationStatus): AsyncStatusToken => {
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

const STATUS_COUNT_LABEL: Record<Exclude<AsyncStatusToken, "active">, string> = {
	queued: "queued",
	complete: "confirmed",
	failed: "failed",
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

	// Sync from sessionStorage on mount to prevent hydration mismatch
	useEffect(() => {
		try {
			if (sessionStorage.getItem('asyncPanelExpanded') === 'true') {
				setExpanded(true);
			}
		} catch {}
	}, []);

	// Sync to sessionStorage on change
	useEffect(() => {
		try {
			sessionStorage.setItem('asyncPanelExpanded', String(expanded));
		} catch {}
	}, [expanded]);

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

	// The active operation is the most prominent item: it always renders in
	// full, outside the collapsible rest-of-queue section.
	const activeIndex = useMemo(() => queueItems.findIndex((i) => i.status === "active"), [queueItems]);
	const activeItem = activeIndex >= 0 ? queueItems[activeIndex] : null;
	const restItems = useMemo(
		() => queueItems.filter((_, index) => index !== activeIndex),
		[queueItems, activeIndex]
	);

	useEffect(() => {
		// Close open detail if item list changes and index no longer valid
		if (openIndex !== null && openIndex >= restItems.length) setOpenIndex(null);
	}, [restItems, openIndex]);

	const restSummary = useMemo(() => {
		const counts: Record<string, number> = {};
		restItems.forEach((item) => {
			counts[item.status] = (counts[item.status] ?? 0) + 1;
		});
		return (Object.keys(counts) as Array<keyof typeof STATUS_COUNT_LABEL>)
			.filter((status) => counts[status] > 0)
			.map((status) => `${counts[status]} ${STATUS_COUNT_LABEL[status]}`)
			.join(" · ");
	}, [restItems]);

	// Live announcement for the operation the user cares about most right now.
	const [liveText, setLiveText] = useState("");
	useEffect(() => {
		const headline = activeItem ?? queueItems[0];
		if (headline) {
			setLiveText(`${headline.title}: ${ASYNC_STATUS_VISUALS[headline.status].badge}`);
		} else {
			setLiveText("");
		}
	}, [queueItems, activeItem]);

	return (
		<section className='min-w-0 max-w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 sm:p-7'>
			<div className='border-b border-white/[0.08] pb-5'>
				<p className='break-words text-xs font-semibold uppercase tracking-[0.24em] text-red-300'>
					{eyebrow}
				</p>
				<h2 className='mt-3 break-words text-2xl font-semibold text-white'>{title}</h2>
				<p className='mt-2 break-words text-sm leading-6 text-gray-300'>{description}</p>
			</div>

			<div className='mt-6 space-y-2.5'>
				{stages.map((stage, index) => {
					const StageIcon = stage.icon ?? (index < 2 ? ShieldCheck : Wallet);

					return (
						<article
							key={stage.label}
							className='min-w-0 rounded-2xl border border-white/[0.08] bg-black/20 p-3.5'>
							<div className='flex min-w-0 items-start justify-between gap-4'>
								<div className='flex min-w-0 items-start gap-3'>
									<div className='flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-red-300'>
										<StageIcon className='h-4 w-4' />
									</div>
									<div className='min-w-0'>
										<div className='flex flex-wrap items-center gap-2'>
											<h3 className='break-words text-sm font-semibold text-white'>
												{index + 1}. {stage.label}
											</h3>
											<span className='rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400'>
												{stage.duration}
											</span>
										</div>
										<p className='mt-1.5 break-words text-sm leading-6 text-gray-300'>
											{stage.detail}
										</p>
									</div>
								</div>
								<span className='hidden flex-shrink-0 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-100 sm:inline-flex'>
									{stage.placement}
								</span>
							</div>
							<p className='mt-2 break-words text-xs uppercase tracking-[0.16em] text-gray-500 sm:hidden'>
								{stage.placement}
							</p>
						</article>
					);
				})}
			</div>

			{/* Queue: active operation stays fully visible; queued/complete/failed
			    items collapse behind a single toggle so the rail doesn't dominate
			    the screen. Desktop places this panel in a top-right sticky rail;
			    mobile stacks it inline below the initiating form (see caller). */}
			<div className='mt-6 min-w-0'>
				<div className='flex min-w-0 items-start justify-between gap-3'>
					<div className='min-w-0'>
						<h3 className='break-words text-sm font-semibold text-white'>{queueTitle}</h3>
						<p className='mt-1 break-words text-sm leading-6 text-gray-300'>
							{queueDescription}
						</p>
					</div>
					<button
						aria-expanded={expanded}
						aria-controls='ops-panel'
						onClick={() => setExpanded((s) => !s)}
						className='inline-flex flex-shrink-0 items-center gap-2 rounded-md bg-white/[0.02] px-2 py-1 text-xs text-gray-300 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400'>
						{expanded ? (
							<ChevronUp className='h-4 w-4' />
						) : (
							<ChevronDown className='h-4 w-4' />
						)}
						<span className='sr-only'>Toggle operations panel</span>
					</button>
				</div>

				<div className='mt-4 space-y-3'>
					{activeItem ? (
						<ActiveOperationCard item={activeItem} />
					) : queueItems.length === 0 ? (
						<p className='rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm leading-6 text-gray-400'>
							No operations yet. This panel populates automatically once a contract action starts.
						</p>
					) : null}

					{restItems.length > 0 ? (
						<div id='ops-panel'>
							{!expanded ? (
								<button
									onClick={() => setExpanded(true)}
									aria-expanded={false}
									className='flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-black/10 px-4 py-2.5 text-left text-xs text-gray-300 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400'>
									<span>
										{restItems.length} more {restItems.length === 1 ? "item" : "items"}
										{restSummary ? ` · ${restSummary}` : ""}
									</span>
									<ChevronDown className='h-4 w-4 flex-shrink-0' />
								</button>
							) : (
								<div className='space-y-2'>
									{restItems.map((item, index) => (
										<CompactOperationRow
											key={`${item.title}-${item.status}-${index}`}
											item={item}
											isOpen={openIndex === index}
											onToggle={() => setOpenIndex(openIndex === index ? null : index)}
											controlsId={`op-${index}`}
										/>
									))}
								</div>
							)}
						</div>
					) : null}
				</div>
				<div aria-hidden className='sr-only' aria-live='polite'>{liveText}</div>
			</div>

			{footer ? (
				<p className='mt-4 break-words text-xs leading-5 text-gray-500'>{footer}</p>
			) : null}
		</section>
	);
}

function ActiveOperationCard({ item }: { item: QueueItem }) {
	const visual = ASYNC_STATUS_VISUALS.active;
	const StatusIcon = visual.Icon;

	return (
		<article className={`relative rounded-2xl border p-4 shadow-lg shadow-red-950/20 ring-2 ring-red-400/20 ${visual.cardClass}`}>
			<div className='flex items-start gap-3'>
				<div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border ${visual.iconWrapClass}`}>
					<StatusIcon className={`h-5 w-5 ${visual.iconClass} ${visual.spin ? "animate-spin" : ""}`} />
				</div>
				<div className='min-w-0 flex-1'>
					<div className='flex flex-wrap items-center gap-2'>
						<h4 className='break-words text-sm font-semibold text-white'>{item.title}</h4>
						<span className='inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-red-200'>
							<span className={`h-1.5 w-1.5 rounded-full ${visual.dotClass} animate-pulse`} aria-hidden />
							{visual.badge}
						</span>
					</div>
					<p className='mt-1.5 break-words text-sm leading-6 text-gray-300'>{item.detail}</p>
					<p className='mt-2 text-xs text-gray-400'>{item.duration}</p>
				</div>
			</div>
		</article>
	);
}

function CompactOperationRow({
	item,
	isOpen,
	onToggle,
	controlsId,
}: {
	item: QueueItem;
	isOpen: boolean;
	onToggle: () => void;
	controlsId: string;
}) {
	const visual = ASYNC_STATUS_VISUALS[item.status];
	const StatusIcon = visual.Icon;

	return (
		<article className={`flex flex-col rounded-xl border p-2.5 ${visual.cardClass}`}>
			<div className='flex items-center justify-between gap-3'>
				<div className='flex min-w-0 items-center gap-2.5'>
					<div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border ${visual.iconWrapClass}`}>
						<StatusIcon className={`h-3.5 w-3.5 ${visual.iconClass} ${visual.spin ? "animate-spin" : ""}`} />
					</div>
					<div className='min-w-0'>
						<div className='flex items-center gap-2'>
							<h4 className='truncate text-xs font-semibold text-white'>{item.title}</h4>
							<span className='hidden text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400 md:inline'>
								{visual.badge}
							</span>
						</div>
					</div>
				</div>
				<div className='flex flex-shrink-0 items-center gap-2'>
					<span className='text-[11px] text-gray-400'>{item.duration}</span>
					<button
						aria-expanded={isOpen}
						aria-controls={controlsId}
						aria-label={isOpen ? `Hide details for ${item.title}` : `Show details for ${item.title}`}
						onClick={onToggle}
						className='inline-flex items-center justify-center rounded-md p-1.5 text-gray-300 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400'>
						{isOpen ? <ChevronUp className='h-3.5 w-3.5' /> : <ChevronDown className='h-3.5 w-3.5' />}
					</button>
				</div>
			</div>

			{isOpen ? (
				<div id={controlsId} className='mt-2.5 border-t border-white/[0.06] pt-2.5 text-xs leading-5 text-gray-300'>
					<p>{item.detail}</p>
					{item.status === "failed" ? (
						<button className='mt-2 rounded-md bg-amber-500/10 px-3 py-1 text-amber-200'>Retry</button>
					) : null}
				</div>
			) : null}
		</article>
	);
}
