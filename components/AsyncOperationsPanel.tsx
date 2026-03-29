"use client";

import {
	ArrowUpRight,
	CheckCircle2,
	Clock3,
	Loader2,
	ShieldCheck,
	Wallet,
	type LucideIcon,
} from "lucide-react";

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
	status: "active" | "queued" | "complete";
};

interface AsyncOperationsPanelProps {
	eyebrow: string;
	title: string;
	description: string;
	stages: AsyncStage[];
	queueTitle: string;
	queueDescription: string;
	queueItems: QueueItem[];
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
} as const;

export default function AsyncOperationsPanel({
	eyebrow,
	title,
	description,
	stages,
	queueTitle,
	queueDescription,
	queueItems,
	footer,
}: AsyncOperationsPanelProps) {
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

			<div className='mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-4'>
				<div className='flex items-start justify-between gap-3'>
					<div>
						<h3 className='text-sm font-semibold text-white'>{queueTitle}</h3>
						<p className='mt-1 text-sm leading-6 text-gray-300'>
							{queueDescription}
						</p>
					</div>
					<ArrowUpRight className='mt-1 h-4 w-4 flex-shrink-0 text-gray-500' />
				</div>

				<div className='mt-4 space-y-3'>
					{queueItems.map((item, index) => {
						const statusConfig = queueStatusStyles[item.status];
						const StatusIcon = statusConfig.Icon;

						return (
							<article
								key={`${item.title}-${item.status}`}
								className={`rounded-2xl border p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] ${statusConfig.cardClass} ${
									index > 0 ? "sm:-mt-2 sm:ml-4" : ""
								}`}>
								<div className='flex items-start justify-between gap-4'>
									<div className='flex items-start gap-3'>
										<div className='flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]'>
											<StatusIcon
												className={`h-4 w-4 ${statusConfig.iconClass} ${
													statusConfig.spin ? "animate-spin" : ""
												}`}
											/>
										</div>
										<div>
											<div className='flex flex-wrap items-center gap-2'>
												<h4 className='text-sm font-semibold text-white'>
													{item.title}
												</h4>
												<span className='rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400'>
													{statusConfig.badge}
												</span>
											</div>
											<p className='mt-2 text-sm leading-6 text-gray-300'>
												{item.detail}
											</p>
										</div>
									</div>
									<span className='rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-gray-300'>
										{item.duration}
									</span>
								</div>
							</article>
						);
					})}
				</div>
			</div>

			{footer ? (
				<p className='mt-4 text-xs leading-5 text-gray-500'>{footer}</p>
			) : null}
		</section>
	);
}
