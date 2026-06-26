"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
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
import { apiClient } from "@/lib/client/apiClient";
import { runWidgetFetchWithRetry } from "@/lib/client/widgetFetchRetry";
import { Bill } from "@/lib/contracts/bill-payments";
import { WidgetErrorState } from "@/components/ui/WidgetStates";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useToast } from "@/lib/context/ToastContext";
import { CTA_TEST_IDS } from "@/lib/cta-testids";
import { useClientTranslator } from "@/lib/i18n/client";

type AddBillResponse = ActionState & {
	name?: string;
	amount?: number;
	dueDate?: string;
};

const getBillStages = (t: any) => [
	{
		label: t("bills.billStages.stage1Label"),
		duration: "0-2 sec",
		detail: t("bills.billStages.stage1Detail"),
		placement: t("bills.billStages.stage1Placement"),
		icon: ShieldCheck,
	},
	{
		label: t("bills.billStages.stage2Label"),
		duration: "2-6 sec",
		detail: t("bills.billStages.stage2Detail"),
		placement: t("bills.billStages.stage2Placement"),
		icon: Layers3,
	},
	{
		label: t("bills.billStages.stage3Label"),
		duration: "15-45 sec",
		detail: t("bills.billStages.stage3Detail"),
		placement: t("bills.billStages.stage3Placement"),
		icon: Wallet,
	},
	{
		label: t("bills.billStages.stage4Label"),
		duration: "5-30 sec",
		detail: t("bills.billStages.stage4Detail"),
		placement: t("bills.billStages.stage4Placement"),
		icon: Clock3,
	},
];

const getBillQueue = (t: any) => [
	{
		title: t("bills.billQueue.item1Title"),
		duration: "Live",
		detail: t("bills.billQueue.item1Detail"),
		status: "active" as const,
	},
	{
		title: t("bills.billQueue.item2Title"),
		duration: "Queued",
		detail: t("bills.billQueue.item2Detail"),
		status: "queued" as const,
	},
	{
		title: t("bills.billQueue.item3Title"),
		duration: "< 1 min",
		detail: t("bills.billQueue.item3Detail"),
		status: "complete" as const,
	},
];

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Minimal mock bills placeholder for client-side warning behavior in dev/test
const mockBills: Bill[] = [];

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
	const { t } = useClientTranslator();
	const formSectionRef = useRef<HTMLDivElement>(null);
	const [state, formAction, pending] = useFormAction<AddBillResponse>("/api/bills");
	const [isRecurring, setIsRecurring] = useState(false);
	const [frequency, setFrequency] = useState("monthly");
	const [monthlyDay, setMonthlyDay] = useState("1");
	const [weeklyDay, setWeeklyDay] = useState("Monday");
	const [reminderLead, setReminderLead] = useState("3");
	const { toast } = useToast();

	const recurrencePreview = useMemo(() => {
		if (!isRecurring) return t("bills.form.oneTimeBill");
		if (frequency === "weekly") return t("bills.form.weeklyOn", { day: weeklyDay });
		return t("bills.form.monthlyOn", { day: ordinalDay(monthlyDay) });
	}, [frequency, isRecurring, monthlyDay, weeklyDay, t]);

	const [bills, setBills] = useState<Bill[]>([]);
	const [stats, setStats] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		const overdueBill = bills.find((b) => b.status === "overdue" || b.status === "urgent");
		if (overdueBill) {
			toast({
				variant: "warning",
				title: t("bills.toast.overdueTitle"),
				description: t("bills.toast.overdueDesc", { name: overdueBill.name, date: overdueBill.dueDate }),
				action: {
					label: t("bills.toast.payNow"),
					onClick: () => {
						const formElement = document.getElementById("name");
						if (formElement) formElement.scrollIntoView({ behavior: "smooth" });
					},
				},
			});
		}
	}, [toast, bills, t]);

	const fetchBillsData = useCallback((signal?: AbortSignal) => {
		return runWidgetFetchWithRetry({
			signal,
			load: async () => {
				const [billsRes, statsRes] = await Promise.all([
					apiClient.get('/api/bills', { signal }),
					apiClient.get('/api/bills/total-unpaid', { signal })
				]);
				
				if (!billsRes || !statsRes) throw new Error("Session expired");
				if (!billsRes.ok || !statsRes.ok) throw new Error("Failed to load bills data");
				
				const billsJson = await billsRes.json();
				const statsJson = await statsRes.json();
				
				const fetchedBills: Bill[] = billsJson.data?.bills || [];
				const fetchedStats = statsJson.data;
				const paidBills = fetchedBills.filter((bill: Bill) => bill.status === 'paid');
				const paidAmount = paidBills.reduce((acc: number, bill: Bill) => acc + bill.amount, 0);
				const overdueCount = fetchedBills.filter((bill: Bill) => (bill.status as string) === 'overdue' || (bill.status as string) === 'urgent').length;

				return {
					bills: fetchedBills,
					stats: {
						totalUnpaid: {
							amount: fetchedStats?.totalUnpaid?.toLocaleString() || '0',
							pendingCount: fetchedStats?.count || 0
						},
						overdueCount,
						paidThisMonth: {
							amount: paidAmount.toLocaleString(),
							paymentCount: paidBills.length
						}
					}
				};
			}
		});
	}, []);

	const handleRetry = useCallback(() => {
		setReloadKey((current) => current + 1);
	}, []);

	useEffect(() => {
		const controller = new AbortController();

		setIsLoading(true);
		setError(null);

		void fetchBillsData(controller.signal)
			.then((result) => {
				if (controller.signal.aborted) {
					return;
				}

				setBills(result.bills);
				setStats(result.stats);
				setIsLoading(false);
			})
			.catch((err) => {
				if (controller.signal.aborted) {
					return;
				}

				setError(err instanceof Error ? err : new Error("Unknown error"));
				setIsLoading(false);
			});

		return () => controller.abort();
	}, [fetchBillsData, reloadKey]);

	function handleAddBill() {
		formSectionRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	}

	return (
		<div className='min-h-screen bg-[#010101]'>
			<PageHeader
				title={t("bills.pageTitle")}
				subtitle={t("bills.pageSubtitle")}
				ctaLabel={t("bills.addBillCta")}
				headingId='bills-page-heading'
				onCtaClick={handleAddBill}
				ctaTestId={CTA_TEST_IDS.page.billsPrimary}
				showBottomDivider
			/>

			<main className='mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
				{error ? (
					<div className="mb-8">
						<WidgetErrorState 
							title={t("bills.loadFailed")} 
							message={error.message} 
							onRetry={handleRetry} 
						/>
					</div>
				) : isLoading ? (
					<div className="mb-8 space-y-8" aria-busy="true" aria-hidden="true">
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
								{t("bills.billCreationEyebrow")}
							</p>
							<h2 className='mt-3 text-2xl font-semibold text-white'>
								{t("bills.addBillTitle")}
							</h2>
							<p className='mt-2 text-sm leading-6 text-gray-300'>
								{t("bills.billCreationDesc")}
							</p>
						</div>
						<div className='mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300'>
							<p>
								{t("bills.billWarning")}
							</p>
						</div>

						<form action={formAction} className='mt-6 space-y-6'>
							<div className='grid gap-1'>
								<label htmlFor='name' className='block text-sm font-medium text-gray-300'>
									{t("bills.form.nameLabel")}
								</label>
								<input
									id='name'
									name='name'
									type='text'
									defaultValue={state.name}
									placeholder={t("bills.form.namePlaceholder")}
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
										{t("bills.form.amountLabel")}
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
										{t("bills.form.dueDateLabel")}
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
													{t("bills.form.repeatLabel")}
												</label>
												<span
													className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
														isRecurring
															? "border-red-400/40 bg-red-500/15 text-red-200"
															: "border-white/10 bg-white/5 text-white/45"
													}`}>
													{isRecurring ? t("bills.form.repeatOn") : t("bills.form.repeatOff")}
												</span>
											</div>
											<p className='mt-1 text-sm leading-5 text-gray-400'>
												{isRecurring
													? t("bills.form.repeatDescOn", { preview: recurrencePreview, days: reminderLead })
													: t("bills.form.repeatDescOff")}
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
												{t("bills.form.repeatsHeader")}
											</label>
											<select
												id='recurrenceFrequency'
												name='recurrenceFrequency'
												value={frequency}
												onChange={(event) => setFrequency(event.target.value)}
												className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-3 text-sm text-white focus:border-transparent focus:ring-2 focus:ring-red-500'>
												<option value='monthly'>{t("bills.form.monthly")}</option>
												<option value='weekly'>{t("bills.form.weekly")}</option>
											</select>
										</div>

										{frequency === "monthly" ? (
											<div className='grid gap-1'>
												<label htmlFor='recurrenceDayOfMonth' className='text-xs font-semibold uppercase tracking-[0.14em] text-white/50'>
													{t("bills.form.dayHeader")}
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
													{t("bills.form.dayHeader")}
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
												{t("bills.form.reminderHeader")}
											</label>
											<select
												id='recurrenceReminderLead'
												name='recurrenceReminderLead'
												value={reminderLead}
												onChange={(event) => setReminderLead(event.target.value)}
												className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-3 text-sm text-white focus:border-transparent focus:ring-2 focus:ring-red-500'>
												<option value='1'>{t("bills.form.daysBefore1")}</option>
												<option value='3'>{t("bills.form.daysBefore3")}</option>
												<option value='5'>{t("bills.form.daysBefore5")}</option>
											</select>
										</div>

										<div className='rounded-xl border border-white/10 bg-black/25 px-3 py-3 md:col-span-3'>
											<p className='text-xs font-semibold uppercase tracking-[0.14em] text-white/45'>
												{t("bills.form.previewHeader")}
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
								idleTitle={t("bills.status.idleTitle")}
								idleDescription={t("bills.status.idleDesc")}
								pendingTitle={t("bills.status.pendingTitle")}
								pendingDescription={t("bills.status.pendingDesc")}
								successTitle={t("bills.status.successTitle")}
								successDescription={t("bills.status.successDesc")}
								errorTitle={t("bills.status.errorTitle")}
							/>

							<button
								type='submit'
								className='flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-70'
								disabled={pending}>
								{pending ? (
									<>
										<Loader2 className='w-5 h-5 animate-spin' />
										<span>{t("bills.form.submitPreparing")}</span>
									</>
								) : (
									t("bills.form.submitAdd")
								)}
							</button>
						</form>
					</div>

					<aside className='space-y-6 xl:sticky xl:top-6'>
						<AsyncOperationsPanel
							eyebrow={t("bills.asyncPanel.eyebrow")}
							title={t("bills.asyncPanel.title")}
							description={t("bills.asyncPanel.desc")}
							stages={getBillStages(t)}
							queueTitle={t("bills.asyncPanel.queueTitle")}
							queueDescription={t("bills.asyncPanel.queueDesc")}
							queueItems={getBillQueue(t)}
							footer={t("bills.asyncPanel.footer")}
						/>
					</aside>
				</div>
			</main>
		</div>
	);
}
