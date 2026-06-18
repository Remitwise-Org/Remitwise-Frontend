"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Layers3, ShieldCheck, Wallet, Clock3 } from "lucide-react";
import { UnpaidBillsSection } from "@/components/Bills/UnpaidBillsSection";
import PageHeader from "@/components/PageHeader";
import BillPaymentsStatsCards from "./components/BillPaymentsStatsCards";
import RecentPaymentsSection from "@/components/Bills/RecentPaymentsSection";
import Toggle from "@/components/Toggle";
import { ActionState } from "@/lib/auth/middleware";
import { useFormAction } from "@/lib/hooks/useFormAction";
import AsyncOperationsPanel from "@/components/AsyncOperationsPanel";
import AsyncSubmissionStatus from "@/components/AsyncSubmissionStatus";
import { useToast } from "@/lib/context/ToastContext";
import { mockBills } from "@/lib/mockdata/bills";

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

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function ordinalDay(day: string) {
	const value = Number(day);
	const suffix =
		value % 10 === 1 && value % 100 !== 11
			? "st"
			: value % 10 === 2 && value % 100 !== 12
				? "nd"
				: value % 10 === 3 && value % 100 !== 13
					? "rd"
					: "th";

	return `${value}${suffix}`;
}

export default function Bills() {
	const formSectionRef = useRef<HTMLDivElement>(null);
	const [state, formAction, pending] = useFormAction<AddBillResponse>("/api/bills");
	const [isRecurring, setIsRecurring] = useState(false);
	const [frequency, setFrequency] = useState("monthly");
	const [monthlyDay, setMonthlyDay] = useState("1");
	const [weeklyDay, setWeeklyDay] = useState("Monday");
	const [reminderLead, setReminderLead] = useState("3");
	const { toast } = useToast();

	const recurrencePreview = useMemo(() => {
		if (!isRecurring) return "One-time bill";
		if (frequency === "weekly") return `Weekly on ${weeklyDay}`;
		return `Monthly on the ${ordinalDay(monthlyDay)}`;
	}, [frequency, isRecurring, monthlyDay, weeklyDay]);

	useEffect(() => {
		const overdueBill = mockBills.find((b) => b.status === "overdue");
		if (overdueBill) {
			toast({
				variant: "warning",
				title: "Bill overdue",
				description: `${overdueBill.title} was due on ${overdueBill.dueDate}.`,
				action: {
					label: "Pay now",
					onClick: () => {
						const formElement = document.getElementById("name");
						if (formElement) formElement.scrollIntoView({ behavior: "smooth" });
					},
				},
			});
		}
	}, [toast]);

	const [bills, setBills] = useState<Bill[]>([]);
	const [stats, setStats] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const fetchBillsData = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const [billsRes, statsRes] = await Promise.all([
				apiClient.get('/api/bills'),
				apiClient.get('/api/bills/total-unpaid')
			]);
			
			if (!billsRes || !statsRes) throw new Error("Session expired");
			if (!billsRes.ok || !statsRes.ok) throw new Error("Failed to load bills data");
			
			const billsJson = await billsRes.json();
			const statsJson = await statsRes.json();
			
			const fetchedBills: Bill[] = billsJson.data?.bills || [];
			const fetchedStats = statsJson.data;

			setBills(fetchedBills);

			const paidBills = fetchedBills.filter((b: Bill) => b.status === 'paid');
			const paidAmount = paidBills.reduce((acc: number, b: Bill) => acc + b.amount, 0);
			const overdueCount = fetchedBills.filter((b: Bill) => b.status === 'overdue' || b.status === 'urgent').length;

			setStats({
				totalUnpaid: {
					amount: fetchedStats?.totalUnpaid?.toLocaleString() || '0',
					pendingCount: fetchedStats?.count || 0
				},
				overdueCount,
				paidThisMonth: {
					amount: paidAmount.toLocaleString(),
					paymentCount: paidBills.length
				}
			});
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Unknown error"));
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchBillsData();
	}, []);

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
				{error ? (
					<div className="mb-8">
						<WidgetErrorState 
							title="Failed to load bills" 
							message={error.message} 
							onRetry={fetchBillsData} 
						/>
					</div>
				) : isLoading ? (
					<div className="mb-8 space-y-8">
						<SkeletonList rows={3} variant="cards" />
						<SkeletonList rows={3} variant="table" />
					</div>
				) : (
					<>
						<section className='mb-8'>
							<BillPaymentsStatsCards stats={stats} />
						</section>

						<div className='mb-8'>
							<UnpaidBillsSection bills={bills} />
						</div>

						<div className='mb-8'>
							<RecentPaymentsSection bills={bills} />
						</div>
					</>
				)}

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
						</div>
						<div className='mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300'>
							<p>
								This bill request is built as an on-chain USDC payment payload. Your wallet signs and submits the transaction; RemitWise only prepares the payload.
							</p>
						</div>

						<form action={formAction} className='mt-6 space-y-6'>
							<div className='grid gap-1'>
								<label htmlFor='name' className='block text-sm font-medium text-gray-300'>
									Bill Name
								</label>
								<input
									id='name'
									name='name'
									type='text'
									defaultValue={state.name}
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
									<label htmlFor='amount' className='block text-sm font-medium text-gray-300'>
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
									<label htmlFor='dueDate' className='block text-sm font-medium text-gray-300'>
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

							<section
								className={`rounded-2xl border p-4 transition-colors ${
									isRecurring
										? "border-red-500/35 bg-red-500/10"
										: "border-white/[0.08] bg-black/20"
								}`}
								aria-labelledby='recurring-bill-label'>
								<input type='hidden' name='recurring' value={isRecurring ? "true" : "false"} />
								<input type='hidden' name='recurrenceLabel' value={isRecurring ? recurrencePreview : ""} />
								<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
									<div className='flex min-w-0 items-start gap-3'>
										<div className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-red-300'>
											<CalendarClock className='h-4 w-4' aria-hidden='true' />
										</div>
										<div className='min-w-0'>
											<div className='flex flex-wrap items-center gap-2'>
												<label
													id='recurring-bill-label'
													htmlFor='recurring-toggle'
													className='text-sm font-semibold text-white'>
													Repeat this bill
												</label>
												<span
													className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
														isRecurring
															? "border-red-400/40 bg-red-500/15 text-red-200"
															: "border-white/10 bg-white/5 text-white/45"
													}`}>
													{isRecurring ? "On" : "Off"}
												</span>
											</div>
											<p className='mt-1 text-sm leading-5 text-gray-400'>
												{isRecurring
													? `${recurrencePreview}; reminders start ${reminderLead} days before each due date.`
													: "Leave off for one-time bills, or turn on to add a visible payment schedule."}
											</p>
										</div>
									</div>
									<Toggle
										id='recurring-toggle'
										enabled={isRecurring}
										onChange={setIsRecurring}
										ariaLabelledBy='recurring-bill-label'
									/>
								</div>

								{isRecurring && (
									<div className='mt-4 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-3'>
										<div className='grid gap-1'>
											<label htmlFor='recurrenceFrequency' className='text-xs font-semibold uppercase tracking-[0.14em] text-white/50'>
												Repeats
											</label>
											<select
												id='recurrenceFrequency'
												name='recurrenceFrequency'
												value={frequency}
												onChange={(event) => setFrequency(event.target.value)}
												className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-3 text-sm text-white focus:border-transparent focus:ring-2 focus:ring-red-500'>
												<option value='monthly'>Monthly</option>
												<option value='weekly'>Weekly</option>
											</select>
										</div>

										{frequency === "monthly" ? (
											<div className='grid gap-1'>
												<label htmlFor='recurrenceDayOfMonth' className='text-xs font-semibold uppercase tracking-[0.14em] text-white/50'>
													Day
												</label>
												<select
													id='recurrenceDayOfMonth'
													name='recurrenceDayOfMonth'
													value={monthlyDay}
													onChange={(event) => setMonthlyDay(event.target.value)}
													className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-3 text-sm text-white focus:border-transparent focus:ring-2 focus:ring-red-500'>
													{Array.from({ length: 28 }, (_, index) => `${index + 1}`).map((day) => (
														<option key={day} value={day}>
															{ordinalDay(day)}
														</option>
													))}
												</select>
											</div>
										) : (
											<div className='grid gap-1'>
												<label htmlFor='recurrenceDayOfWeek' className='text-xs font-semibold uppercase tracking-[0.14em] text-white/50'>
													Day
												</label>
												<select
													id='recurrenceDayOfWeek'
													name='recurrenceDayOfWeek'
													value={weeklyDay}
													onChange={(event) => setWeeklyDay(event.target.value)}
													className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-3 text-sm text-white focus:border-transparent focus:ring-2 focus:ring-red-500'>
													{weekDays.map((day) => (
														<option key={day} value={day}>
															{day}
														</option>
													))}
												</select>
											</div>
										)}

										<div className='grid gap-1'>
											<label htmlFor='recurrenceReminderLead' className='text-xs font-semibold uppercase tracking-[0.14em] text-white/50'>
												Reminder
											</label>
											<select
												id='recurrenceReminderLead'
												name='recurrenceReminderLead'
												value={reminderLead}
												onChange={(event) => setReminderLead(event.target.value)}
												className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-3 text-sm text-white focus:border-transparent focus:ring-2 focus:ring-red-500'>
												<option value='1'>1 day before</option>
												<option value='3'>3 days before</option>
												<option value='5'>5 days before</option>
											</select>
										</div>

										<div className='rounded-xl border border-white/10 bg-black/25 px-3 py-3 md:col-span-3'>
											<p className='text-xs font-semibold uppercase tracking-[0.14em] text-white/45'>
												Card label preview
											</p>
											<p className='mt-1 text-sm font-semibold text-white'>{recurrencePreview}</p>
										</div>
									</div>
								)}
							</section>

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
