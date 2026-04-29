"use client";

import { useRef } from "react";
import { Loader2, Layers3, ShieldCheck, Wallet, Clock3 } from "lucide-react";
import { UnpaidBillsSection } from "@/components/Bills/UnpaidBillsSection";
import PageHeader from "@/components/PageHeader";
import BillPaymentsStatsCards from "./components/BillPaymentsStatsCards";
import RecentPaymentsSection from "@/components/Bills/RecentPaymentsSection";
import { ActionState } from "@/lib/auth/middleware";
import { useFormAction } from "@/lib/hooks/useFormAction";
import AsyncOperationsPanel from "@/components/AsyncOperationsPanel";
import AsyncSubmissionStatus from "@/components/AsyncSubmissionStatus";

type AddBillResponse = ActionState & {
	name?: string;
	amount?: number;
	dueDate?: string;
};

const billStages = [
	{
		label: "Validate bill details",
		duration: "0-2 sec",
		detail:
			"Keep field errors attached to the triggering inputs so users do not need to reconcile a toast with the form.",
		placement: "Inline at field level",
		icon: ShieldCheck,
	},
	{
		label: "Prepare contract payload",
		duration: "2-6 sec",
		detail:
			"The form card should own the build state because the user still needs the bill amount, schedule, and recurring toggle in view.",
		placement: "Inline above submit button",
		icon: Layers3,
	},
	{
		label: "Collect wallet approval",
		duration: "15-45 sec",
		detail:
			"Open a focused confirmation step only after the contract payload succeeds and the user can act immediately.",
		placement: "Wallet modal or sheet",
		icon: Wallet,
	},
	{
		label: "Submit and confirm",
		duration: "5-30 sec",
		detail:
			"Show network progress in a stacked surface that persists even after the form scrolls away.",
		placement: "Top-right desktop, inline mobile",
		icon: Clock3,
	},
];

const billQueue = [
	{
		title: "Create bill contract request",
		duration: "Live",
		detail:
			"Primary submission remains expanded until wallet approval or an error resolves.",
		status: "active" as const,
	},
	{
		title: "Recurring schedule verification",
		duration: "Queued",
		detail:
			"Secondary tasks compress so multiple actions never dominate the screen.",
		status: "queued" as const,
	},
	{
		title: "Previous bill confirmed",
		duration: "< 1 min",
		detail:
			"Leave the success state visible briefly so the user can trust the outcome without opening history.",
		status: "complete" as const,
	},
];

export default function Bills() {
	const formSectionRef = useRef<HTMLDivElement>(null);
	const [state, formAction, pending] = useFormAction<AddBillResponse>("/api/bills");

	function handleAddBill() {
		formSectionRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	}

	return (
		<div className='min-h-screen bg-[#010101]'>
			<PageHeader
				title='Bill Payments'
				subtitle='Manage and track your recurring bills'
				ctaLabel='Add Bill'
				onCtaClick={handleAddBill}
				showBottomDivider
			/>

			<main className='mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
				<section className='mb-8'>
					<BillPaymentsStatsCards />
				</section>

				<div className='mb-8'>
					<UnpaidBillsSection />
				</div>

				<div className='mb-8'>
					<RecentPaymentsSection />
				</div>

				<div className='grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start'>
					<div
						ref={formSectionRef}
						className='rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 sm:p-8'>
						<div className='border-b border-white/[0.08] pb-6'>
							<p className='text-xs font-semibold uppercase tracking-[0.24em] text-red-300'>
								Bill creation
							</p>
							<h2 className='mt-3 text-2xl font-semibold text-white'>
								Add New Bill
							</h2>
							<p className='mt-2 text-sm leading-6 text-gray-300'>
								The initiating form should own validation and contract-build
								feedback. Longer-running submit states should move into a stack
								that stays visible while the user continues working.
							</p>
						<div className='mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300'>
							<p>
								This bill request is built as an on-chain USDC payment payload. Your wallet signs and submits the transaction; RemitWise only prepares the payload.
							</p>
						</div>
									placeholder='e.g., Electricity, School Fees, Rent'
									className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500'
								/>
								{state?.validationErrors ? (
									<div className='text-sm text-red-400'>
										{state.validationErrors.find((err) => err.path === "name")
											?.message || ""}
									</div>
								) : null}
							</div>

							<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
								<div className='grid gap-1'>
									<label className='block text-sm font-medium text-gray-300'>
										Amount (USD)
									</label>
									<div className='relative'>
										<span className='absolute left-4 top-3 text-gray-500'>$</span>
										<input
											id='amount'
											name='amount'
											type='number'
											defaultValue={state.amount}
											placeholder='50.00'
											step='0.01'
											min='0'
											className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-3 pl-8 pr-4 text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500'
										/>
									</div>
									{state?.validationErrors ? (
										<div className='text-sm text-red-400'>
											{state.validationErrors.find((err) => err.path === "amount")
												?.message || ""}
										</div>
									) : null}
								</div>

								<div className='grid gap-1'>
									<label className='block text-sm font-medium text-gray-300'>
										Due Date
									</label>
									<input
										type='date'
										name='dueDate'
										id='dueDate'
										defaultValue={state.dueDate}
										className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white focus:border-transparent focus:ring-2 focus:ring-red-500'
									/>
									{state?.validationErrors ? (
										<div className='text-sm text-red-400'>
											{state.validationErrors.find((err) => err.path === "dueDate")
												?.message || ""}
										</div>
									) : null}
								</div>
							</div>

							<label className='flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4'>
								<input
									type='checkbox'
									name='recurring'
									id='recurring'
									className='h-5 w-5 rounded border-gray-500 bg-[#1a1a1a] text-red-600 focus:ring-red-500'
								/>
								<span className='text-sm font-medium text-gray-300'>
									Recurring bill (for monthly or scheduled payments)
								</span>
							</label>

							<AsyncSubmissionStatus
								pending={pending}
								error={state?.error}
								success={state?.success}
								idleTitle='Submission placement'
								idleDescription='Validation lives at field level, contract-build feedback stays inline above the CTA, and submit progress should move into the persistent stack rail.'
								pendingTitle='Preparing bill contract request'
								pendingDescription='Hold the user in this form context until the bill payload is ready for wallet approval.'
								successTitle='Bill contract request created'
								successDescription='The next step should open wallet approval immediately, while a stacked confirmation card remains visible if the user navigates away.'
								errorTitle='Bill request could not be prepared'
							/>

							<button
								type='submit'
								className='flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-70'
								disabled={pending}>
								{pending ? (
									<>
										<Loader2 className='w-5 h-5 animate-spin' />
										<span>Preparing Contract Request...</span>
									</>
								) : (
									"Add Bill"
								)}
							</button>
						</form>
					</div>

					<aside className='space-y-6 xl:sticky xl:top-6'>
						<AsyncOperationsPanel
							eyebrow='Async behavior'
							title='Bill Submission Pattern'
							description='Recurring bill creation is a good example of why inline build states and persistent submission stacks should be separate surfaces.'
							stages={billStages}
							queueTitle='Stack behavior'
							queueDescription='On desktop, anchor stacked confirmation cards near the top-right edge of the main content. On mobile, move the same stack directly below the initiating form or modal footer.'
							queueItems={billQueue}
							footer='This pass does not require any Tailwind config changes. It uses existing red focus rings, dark surfaces, and border-opacity utilities already present across the app.'
						/>
					</aside>
				</div>
			</main>
		</div>
	);
}
