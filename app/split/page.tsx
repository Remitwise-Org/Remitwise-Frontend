"use client";

import Link from "next/link";
import { Save, ShieldCheck, Wallet, Clock3, Layers3 } from "lucide-react";
import SmartMoneySplitHeader from "@/components/SmartMoneySplitHeader";
import HowItWorks from "@/components/HowItWorksModal";
import AsyncOperationsPanel from "@/components/AsyncOperationsPanel";
import AsyncSubmissionStatus from "@/components/AsyncSubmissionStatus";

const splitStages = [
	{
		label: "Validate allocation",
		duration: "0-2 sec",
		detail:
			"Keep the percentage check inline with the sliders so errors resolve before a contract build starts.",
		placement: "Inline below the total",
		icon: ShieldCheck,
	},
	{
		label: "Build contract request",
		duration: "2-5 sec",
		detail:
			"Show the pending state inside the form card, not in a detached toast, because the user still needs source-of-truth context.",
		placement: "Inline above the primary action",
		icon: Layers3,
	},
	{
		label: "Request wallet signature",
		duration: "15-45 sec",
		detail:
			"Escalate to a blocking wallet confirmation step only after the contract payload is ready and the user can review it.",
		placement: "Modal or wallet sheet",
		icon: Wallet,
	},
	{
		label: "Submit and confirm",
		duration: "5-30 sec",
		detail:
			"Persist confirmation progress in a stacked rail so the user can navigate without losing visibility on the active submission.",
		placement: "Top-right desktop, inline mobile",
		icon: Clock3,
	},
];

const splitQueue = [
	{
		title: "Split configuration update",
		duration: "Live",
		detail:
			"Newest contract action stays at the top of the stack and owns the most visible status surface.",
		status: "active" as const,
	},
	{
		title: "Wallet signature pending",
		duration: "Waiting",
		detail:
			"Secondary work compresses into smaller cards so multiple submissions do not cover the whole screen.",
		status: "queued" as const,
	},
	{
		title: "Previous change confirmed",
		duration: "< 1 min",
		detail:
			"Completed items remain visible briefly so users can verify outcome without scanning elsewhere.",
		status: "complete" as const,
	},
];

export default function SplitConfiguration() {
	return (
		<div className='min-h-screen bg-[#010101]'>
			<SmartMoneySplitHeader />

			<main className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
				<div className='grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start'>
					<div className='rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 sm:p-8'>
						<div className='border-b border-white/[0.08] pb-6'>
							<p className='text-xs font-semibold uppercase tracking-[0.24em] text-red-300'>
								Allocation editor
							</p>
							<h2 className='mt-3 text-2xl font-semibold text-white'>
								Current Allocation
							</h2>
							<p className='mt-2 text-sm leading-6 text-gray-300'>
								Customize how your remittances are distributed, then keep the
								contract submission states anchored to the same area so the
								workflow never feels detached.
							</p>
						</div>

						<form className='mt-6 space-y-6'>
							<SplitInput
								label='Daily Spending'
								description='For immediate family expenses'
								value={50}
								color='bg-blue-500'
							/>
							<SplitInput
								label='Savings'
								description='Allocated to savings goals'
								value={30}
								color='bg-green-500'
							/>
							<SplitInput
								label='Bills'
								description='Automated bill payments'
								value={15}
								color='bg-yellow-500'
							/>
							<SplitInput
								label='Insurance'
								description='Micro-insurance premiums'
								value={5}
								color='bg-violet-500'
							/>

							<div className='rounded-2xl border border-white/[0.08] bg-[#141414] p-5'>
								<div className='flex items-center justify-between gap-4'>
									<div>
										<p className='text-sm font-medium text-gray-300'>Total</p>
										<p className='mt-1 text-sm text-gray-500'>
											Every contract build should block submission until this is
											exactly 100%.
										</p>
									</div>
									<span className='text-3xl font-semibold text-white'>100%</span>
								</div>
							</div>

							<AsyncSubmissionStatus
								pending={false}
								idleTitle='Contract submission placement'
								idleDescription='Keep validation and build feedback inline with the form. Reserve stacked status cards for submit and confirmation so they can persist after navigation.'
								pendingTitle='Building contract request'
								pendingDescription='Show the user that the remittance_split payload is being prepared before the wallet step opens.'
							/>

							<HowItWorks />

							<div className='flex flex-col gap-4 pt-2 sm:flex-row'>
								<Link
									href='/'
									className='flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3.5 text-center font-semibold text-white transition hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]'>
									Cancel
								</Link>
								<button
									type='submit'
									className='flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3.5 font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-60'
									disabled>
									<Save className='h-5 w-5' />
									<span>Connect Contract First</span>
								</button>
							</div>
						</form>
					</div>

					<aside className='space-y-6 xl:sticky xl:top-6'>
						<AsyncOperationsPanel
							eyebrow='Async behavior'
							title='Duration, Stacking, and Placement'
							description='This route is the clearest contract-configuration example, so it sets the pattern for where each submission state should appear.'
							stages={splitStages}
							queueTitle='Stack behavior'
							queueDescription='Keep no more than three visible submission cards at a time. Newest actions stay highest in the stack and mobile collapses the stack inline below the initiating form.'
							queueItems={splitQueue}
							footer='No new Tailwind tokens are required for this pattern. The implementation reuses existing reds, neutrals, focus rings, and arbitrary-value gradients already used in the app.'
						/>
					</aside>
				</div>
			</main>
		</div>
	);
}

function SplitInput({
	label,
	description,
	value,
	color,
}: {
	label: string;
	description: string;
	value: number;
	color: string;
}) {
	return (
		<div className='rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition-colors hover:bg-white/[0.02]'>
			<div className='mb-3 flex items-center justify-between gap-4'>
				<div>
					<label className='block text-sm font-medium text-white'>{label}</label>
					<p className='mt-0.5 text-xs text-gray-500'>{description}</p>
				</div>
				<div className='text-2xl font-semibold text-white'>{value}%</div>
			</div>
			<div className='mb-4 h-2 w-full rounded-full bg-white/10'>
				<div
					className={`${color} h-2 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
					style={{ width: `${value}%` }}></div>
			</div>
			<input
				type='range'
				min='0'
				max='100'
				value={value}
				className='h-1 w-full accent-red-600'
				disabled
			/>
		</div>
	);
}
