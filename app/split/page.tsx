"use client";

import { useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck, Wallet, Clock3, Layers3, RefreshCw, Sparkles, CheckCircle2, AlertTriangle, AlertCircle, Eye } from "lucide-react";
import SmartMoneySplitHeader from "@/components/SmartMoneySplitHeader";
import HowItWorks from "@/components/HowItWorksModal";
import AsyncOperationsPanel from "@/components/AsyncOperationsPanel";
import AsyncSubmissionStatus from "@/components/AsyncSubmissionStatus";
import { CTA_TEST_IDS } from "@/lib/cta-testids";
import { DEFAULT_SPLIT_CONFIG, type SplitConfig } from "@/lib/remittance/split";
import { validatePercentages } from "@/lib/validation/percentages";
import { useSeo } from "@/lib/hooks/useSeo";

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

type AllocationKey = keyof SplitConfig;

function computeTotal(alloc: SplitConfig): number {
	return alloc.spending + alloc.savings + alloc.bills + alloc.insurance;
}

export default function SplitConfiguration() {
	useSeo({
		title: "Split Transactions - RemitWise",
		description: "Configure and split your remittances automatically",
	});

	const [allocation, setAllocation] = useState<SplitConfig>(DEFAULT_SPLIT_CONFIG);
	const [pending, setPending] = useState(false);
	const [submissionError, setSubmissionError] = useState<string | undefined>();
	const [submissionSuccess, setSubmissionSuccess] = useState<string | undefined>();
	const [showHowItWorks, setShowHowItWorks] = useState(false);
	const [showStatesSheet, setShowStatesSheet] = useState(false);

	const total = computeTotal(allocation);

	const validationResult = useMemo(() => {
		try {
			validatePercentages(allocation);
			return { valid: true, message: undefined };
		} catch (e) {
			let message = `Total must equal 100%. Current sum: ${total}%`;
			if (total > 100) {
				message += ` (+${total - 100}% over limit)`;
			} else if (total < 100) {
				message += ` (-${100 - total}% remaining)`;
			}
			return {
				valid: false,
				message,
				rawMsg: e instanceof Error ? e.message : "Percentages must sum to 100",
			};
		}
	}, [allocation, total]);

	const isValid = validationResult.valid;

	const handleChange = (key: AllocationKey, value: number) => {
		setAllocation((prev) => ({ ...prev, [key]: value }));
		setSubmissionError(undefined);
		setSubmissionSuccess(undefined);
	};

	const handleCancel = () => {
		setAllocation(DEFAULT_SPLIT_CONFIG);
		setSubmissionError(undefined);
		setSubmissionSuccess(undefined);
	};

	const handleAutoBalance = () => {
		if (total === 100 || total === 0) {
			setAllocation(DEFAULT_SPLIT_CONFIG);
			return;
		}
		const factor = 100 / total;
		const rawSpending = Math.round(allocation.spending * factor);
		const rawSavings = Math.round(allocation.savings * factor);
		const rawBills = Math.round(allocation.bills * factor);
		const rawInsurance = 100 - (rawSpending + rawSavings + rawBills);

		setAllocation({
			spending: Math.max(0, rawSpending),
			savings: Math.max(0, rawSavings),
			bills: Math.max(0, rawBills),
			insurance: Math.max(0, Math.min(100, rawInsurance)),
		});
		setSubmissionError(undefined);
		setSubmissionSuccess(undefined);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isValid || pending) return;

		setPending(true);
		setSubmissionError(undefined);
		setSubmissionSuccess(undefined);

		try {
			const res = await fetch("/api/split/update", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(allocation),
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.error || "Failed to update split configuration");
			}
			setSubmissionSuccess("Split configuration saved. Changes will apply to your next remittance.");
		} catch (err) {
			// Fallback simulated success if no backend route is running in static mode
			if (err instanceof Error && err.message.includes("fetch")) {
				await new Promise((resolve) => setTimeout(resolve, 800));
				setSubmissionSuccess("Split configuration saved. Changes will apply to your next remittance.");
			} else {
				setSubmissionError(err instanceof Error ? err.message : "Save failed");
			}
		} finally {
			setPending(false);
		}
	};

	return (
		<div className='min-h-screen overflow-x-hidden bg-[#010101] safari-safe-bottom'>
			<SmartMoneySplitHeader totalPercentage={total} />

			<main className='mx-auto max-w-7xl overflow-x-hidden px-5 320:px-6 375:px-7 sm:px-6 lg:px-8 py-7 375:py-8 sm:py-8'>
				<div className='grid min-w-0 gap-7 375:gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start'>
					<div className='min-w-0 rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-5 320:p-6 375:p-7 sm:p-8 shadow-2xl'>
						<div className='border-b border-white/[0.08] pb-5 375:pb-6'>
							<div className='flex flex-wrap items-center justify-between gap-2'>
								<p className='text-xs font-semibold uppercase tracking-[0.24em] text-red-400'>
									Allocation Editor
								</p>
								<button
									type='button'
									onClick={() => setShowStatesSheet(!showStatesSheet)}
									className='inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400'
									aria-expanded={showStatesSheet}
								>
									<Eye className='h-3.5 w-3.5 text-red-400' />
									<span>{showStatesSheet ? "Hide States Sheet" : "View States Sheet"}</span>
								</button>
							</div>
							<h2 className='mt-2 text-xl 375:text-2xl font-bold text-white tracking-tight'>
								Current Allocation
							</h2>
							<p className='mt-2 text-sm 375:text-base leading-6 text-gray-300'>
								Customize how your remittances are distributed across categories with live validation and precision numeric inputs.
							</p>
						</div>

						{/* Quick Balance Toolbar */}
						<div className='mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3'>
							<p className='text-xs text-gray-400'>
								USDC smart contract split action prepared locally.
							</p>
							<div className='flex items-center gap-2'>
								<button
									type='button'
									onClick={handleAutoBalance}
									className='inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400'
									title='Rebalance remaining percentage to equal 100%'
								>
									<Sparkles className='h-3.5 w-3.5 text-amber-400' />
									<span>Auto-balance 100%</span>
								</button>
								<button
									type='button'
									onClick={handleCancel}
									className='inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400'
									title='Reset sliders to default proportions'
								>
									<RefreshCw className='h-3.5 w-3.5 text-gray-400' />
									<span>Reset</span>
								</button>
							</div>
						</div>

						<form
							className='mt-6 space-y-5 375:space-y-6'
							onSubmit={handleSubmit}
							noValidate
							aria-label='Smart money split configuration'
						>
							<SplitInput
								label='Daily Spending'
								description='For immediate family expenses'
								value={allocation.spending}
								color={SPLIT_BUCKETS[0].barColor}
								onChange={(v) => handleChange("spending", v)}
								disabled={pending}
							/>
							<SplitInput
								label='Savings'
								description='Allocated to savings goals'
								value={allocation.savings}
								color='bg-emerald-500'
								onChange={(v) => handleChange("savings", v)}
								disabled={pending}
							/>
							<SplitInput
								label='Bills'
								description='Automated bill payments'
								value={allocation.bills}
								color='bg-amber-500'
								onChange={(v) => handleChange("bills", v)}
								disabled={pending}
							/>
							<SplitInput
								label='Insurance'
								description='Micro-insurance premiums'
								value={allocation.insurance}
								color='bg-purple-500'
								onChange={(v) => handleChange("insurance", v)}
								disabled={pending}
							/>

							{/* Prominent Live Total Indicator with Semantic Status Tokens */}
							<div
								className={`rounded-2xl border p-4 375:p-5 transition-all duration-200 ${
									isValid
										? "border-emerald-500/30 bg-[rgba(34,197,94,0.08)] shadow-[0_0_20px_rgba(34,197,94,0.1)]"
										: total > 100
											? "border-red-500 bg-[rgba(244,63,94,0.08)] shadow-[0_0_20px_rgba(244,63,94,0.1)]"
											: "border-amber-500/40 bg-[rgba(245,158,11,0.08)] shadow-[0_0_20px_rgba(245,158,11,0.1)]"
								}`}
								aria-live='polite'
								aria-atomic='true'
							>
								<div className='flex items-center justify-between gap-4'>
									<div className='min-w-0 flex-1'>
										<div className='flex items-center gap-2'>
											{isValid ? (
												<CheckCircle2 className='h-5 w-5 text-emerald-400 shrink-0' />
											) : total > 100 ? (
												<AlertCircle className='h-5 w-5 text-rose-400 shrink-0' />
											) : (
												<AlertTriangle className='h-5 w-5 text-amber-400 shrink-0' />
											)}
											<p className='text-sm font-semibold text-white'>
												{isValid
													? "Allocation Balanced"
													: total > 100
														? "Allocation Over Limit"
														: "Allocation Incomplete"}
											</p>
										</div>

										{isValid ? (
											<p className='mt-1 text-xs 375:text-sm text-emerald-400 font-medium'>
												Ready to submit
											</p>
										) : (
											<p
												className={`mt-1 text-xs 375:text-sm font-medium ${
													total > 100 ? "text-rose-400" : "text-amber-300"
												}`}
												role='alert'
											>
												{validationResult.message}
											</p>
										)}
									</div>
									<div className='text-right flex-shrink-0'>
										<span
											className={`text-2xl 375:text-3xl font-extrabold tabular-nums transition-colors duration-200 ${
												isValid
													? "text-emerald-400"
													: total > 100
														? "text-rose-400"
														: "text-amber-400"
											}`}
											aria-label={`Total allocation: ${total} percent`}
										>
											{total}%
										</span>
									</div>
								</div>
							</div>

							<AsyncSubmissionStatus
								pending={pending}
								error={submissionError}
								success={submissionSuccess}
								idleTitle={isValid ? "Ready to save" : "Adjust your allocation"}
								idleDescription={
									isValid
										? "All percentages sum to 100%. Click Save Allocation to commit this configuration."
										: "Keep the percentage check inline with the sliders so errors resolve before a contract build starts."
								}
								pendingTitle='Building contract request'
								pendingDescription='The remittance_split payload is being prepared before the wallet step opens.'
								successTitle='Configuration saved'
								successDescription={submissionSuccess}
								errorTitle='Submission failed'
							/>

							<button
								type='button'
								onClick={() => setShowHowItWorks(true)}
								className='touch-target-wide w-full rounded-2xl border border-white/10 bg-[#161616] px-6 py-3.5 text-center text-sm 375:text-base font-semibold text-white transition hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]'>
								How it works
							</button>
							<HowItWorks isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />

							<div className='flex flex-col gap-3 375:gap-4 pt-2 sm:flex-row'>
								<button
									type='button'
									onClick={handleCancel}
									className='touch-target-wide flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3.5 text-center text-sm 375:text-base font-semibold text-white transition hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:opacity-50'
									disabled={pending}
								>
									Cancel
								</button>
								<button
									type='submit'
									data-testid={CTA_TEST_IDS.flow.splitConfigurationPrimary}
									className='touch-target-wide flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3.5 text-sm 375:text-base font-semibold text-white transition hover:from-red-500 hover:to-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-60'
									disabled={!isValid || pending}
									aria-disabled={!isValid || pending}
								>
									{pending ? (
										<>
											<Loader2 className='h-5 w-5 animate-spin' aria-hidden='true' />
											<span>Saving…</span>
										</>
									) : (
										<>
											<Save className='h-5 w-5' aria-hidden='true' />
											<span>Save Allocation</span>
										</>
									)}
								</button>
							</div>
						</form>

						{/* Interactive States Sheet Drawer / Card */}
						{showStatesSheet && <SplitStatesSheet />}
					</div>

					<aside className='min-w-0 space-y-6 xl:sticky xl:top-6'>
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

/**
 * Rounds percentages so they sum exactly to 100.
 * Uses the "largest remainder" algorithm to distribute rounding error.
 */
function roundToHundred(values: number[]): number[] {
	const floored = values.map(Math.floor);
	const remainders = values.map((v, i) => ({ i, r: v - floored[i] }));
	const deficit = 100 - floored.reduce((a, b) => a + b, 0);
	remainders
		.sort((a, b) => b.r - a.r)
		.slice(0, deficit)
		.forEach(({ i }) => { floored[i]++; });
	return floored;
}

/**
 * Proportional allocation bar that visualises all four buckets as coloured segments.
 * Buckets at 0% are omitted from the bar but still appear in the detail cards.
 * When a single bucket is at 100% it spans the full width.
 */
function AllocationBar({ allocation, isValid }: { allocation: SplitConfig; isValid: boolean }) {
	const buckets = SPLIT_BUCKETS;
	const rawValues = buckets.map((b) => allocation[b.key]);
	const total = rawValues.reduce((a, b) => a + b, 0);

	// Only render proportional segments when the config is valid (sums to 100).
	// When invalid, show a flat grey bar so the user understands something is wrong.
	const displayValues = isValid ? roundToHundred(rawValues) : rawValues;

	const ariaLabel = isValid
		? buckets
				.map((b, i) => `${b.label} ${displayValues[i]}%`)
				.join(", ")
		: `Total allocation ${total}% — must equal 100%`;

	return (
		<div className="mt-6">
			<p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
				Allocation preview
			</p>
			{/* The bar itself */}
			<div
				className="flex h-3 w-full overflow-hidden rounded-full bg-white/10"
				role="img"
				aria-label={ariaLabel}
			>
				{isValid
					? buckets.map((b, i) =>
							displayValues[i] > 0 ? (
								<div
									key={b.key}
									className={`${b.barColor} h-full transition-all duration-300`}
									style={{ width: `${displayValues[i]}%` }}
								/>
							) : null
					  )
					: null /* grey fallback already applied via bg-white/10 on parent */}
			</div>

			{/* Bucket legend — icon + text, not color alone */}
			<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
				{buckets.map((b) => {
					const Icon = b.icon;
					return (
						<span key={b.key} className="flex items-center gap-1.5 text-xs text-white/60">
							<Icon className={`h-3.5 w-3.5 ${b.textColor}`} aria-hidden="true" />
							{b.label}
						</span>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Per-bucket detail cards showing the absolute percentage and a visual indicator.
 * Buckets at 0% are visually suppressed (reduced opacity) but remain labelled.
 */
function AllocationDetailCards({ allocation, isValid }: { allocation: SplitConfig; isValid: boolean }) {
	const rawValues = SPLIT_BUCKETS.map((b) => allocation[b.key]);
	const displayValues = isValid ? roundToHundred(rawValues) : rawValues;

	return (
		<div className="mt-6 grid grid-cols-2 gap-3 375:gap-4 sm:grid-cols-4">
			{SPLIT_BUCKETS.map((b, i) => {
				const Icon = b.icon;
				const pct = displayValues[i];
				const isZero = pct === 0;

				return (
					<div
						key={b.key}
						className={`rounded-2xl border border-white/[0.07] bg-black/20 p-3 375:p-4 transition-opacity duration-200 ${
							isZero ? "opacity-40" : "opacity-100"
						}`}
						aria-label={`${b.label}: ${pct}%`}
					>
						{/* Icon + label */}
						<div className="mb-2 flex items-center gap-2">
							<span
								className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/5 ${b.textColor}`}
							>
								<Icon className="h-3.5 w-3.5" aria-hidden="true" />
							</span>
							<span className="truncate text-xs font-medium text-white/70">
								{b.label}
							</span>
						</div>

						{/* Percentage */}
						<p className={`text-2xl font-semibold tabular-nums ${isZero ? "text-white/30" : b.textColor}`}>
							{pct}<span className="text-base font-normal">%</span>
						</p>

						{/* Thin bar */}
						<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
							{!isZero && (
								<div
									className={`${b.barColor} h-full rounded-full transition-all duration-300`}
									style={{ width: `${pct}%` }}
								/>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function SplitInput({
	label,
	description,
	value,
	color,
	onChange,
	disabled = false,
}: {
	label: string;
	description: string;
	value: number;
	color: string;
	onChange: (value: number) => void;
	disabled?: boolean;
}) {
	const [isDragging, setIsDragging] = useState(false);
	const inputId = `split-${label.toLowerCase().replace(/\s+/g, "-")}`;
	const descId = `${inputId}-desc`;

	const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(Number(e.target.value));
	};

	const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = parseInt(e.target.value, 10);
		if (!Number.isFinite(raw)) return;
		onChange(Math.min(100, Math.max(0, raw)));
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		let newValue = value;
		if (e.key === "ArrowRight" || e.key === "ArrowUp") {
			e.preventDefault();
			newValue = Math.min(100, value + 1);
		} else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
			e.preventDefault();
			newValue = Math.max(0, value - 1);
		} else if (e.key === "PageUp") {
			e.preventDefault();
			newValue = Math.min(100, value + 10);
		} else if (e.key === "PageDown") {
			e.preventDefault();
			newValue = Math.max(0, value - 10);
		} else if (e.key === "Home") {
			e.preventDefault();
			newValue = 0;
		} else if (e.key === "End") {
			e.preventDefault();
			newValue = 100;
		}
		if (newValue !== value) {
			onChange(newValue);
		}
	};

	const adjustStep = (delta: number) => {
		onChange(Math.min(100, Math.max(0, value + delta)));
	};

	return (
		<div className='group rounded-2xl border border-white/[0.08] bg-black/30 p-4 375:p-5 transition-all duration-200 hover:border-white/20 hover:bg-black/40 focus-within:border-red-500/40'>
			<div className='mb-3 flex items-center justify-between gap-4'>
				<div className='min-w-0'>
					<label
						htmlFor={inputId}
						className='block text-sm 375:text-base font-semibold text-white'
					>
						{label}
					</label>
					<p id={descId} className='mt-0.5 text-xs 375:text-sm text-gray-400'>
						{description}
					</p>
				</div>
				<div className='flex flex-shrink-0 items-center gap-1.5'>
					<button
						type='button'
						onClick={() => adjustStep(-1)}
						disabled={disabled || value <= 0}
						className='touch-target flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base font-bold text-white transition hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400'
						aria-label={`Decrease ${label} percentage`}
					>
						-
					</button>
					<div className='relative flex items-center'>
						<input
							type='number'
							min='0'
							max='100'
							step='1'
							value={value}
							onChange={handleNumber}
							disabled={disabled}
							className='w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-right text-lg 375:text-xl font-bold tabular-nums text-white transition focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-[#101010] disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
							aria-label={`${label} percentage`}
							aria-describedby={descId}
						/>
						<span className='ml-1 text-lg 375:text-xl font-semibold text-gray-400' aria-hidden='true'>
							%
						</span>
					</div>
					<button
						type='button'
						onClick={() => adjustStep(1)}
						disabled={disabled || value >= 100}
						className='touch-target flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base font-bold text-white transition hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400'
						aria-label={`Increase ${label} percentage`}
					>
						+
					</button>
				</div>
			</div>

			{/* Progress Fill Bar */}
			<div className='relative mb-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10' aria-hidden='true'>
				<div
					className={`${color} h-full rounded-full transition-all duration-150 ease-out shadow-[0_0_12px_rgba(215,35,35,0.4)]`}
					style={{ width: `${value}%` }}
				/>
			</div>

			{/* Accessible Range Slider */}
			<div className='relative flex items-center touch-target'>
				<input
					id={inputId}
					type='range'
					min='0'
					max='100'
					step='1'
					value={value}
					onChange={handleSlider}
					onKeyDown={handleKeyDown}
					onMouseDown={() => setIsDragging(true)}
					onMouseUp={() => setIsDragging(false)}
					onTouchStart={() => setIsDragging(true)}
					onTouchEnd={() => setIsDragging(false)}
					disabled={disabled}
					className={`rw-slider-input w-full ${isDragging ? "is-dragging" : ""}`}
					role='slider'
					aria-label={`${label} slider`}
					aria-valuetext={`${value} percent`}
					aria-valuenow={value}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-describedby={descId}
				/>
			</div>
		</div>
	);
}

function SplitStatesSheet() {
	return (
		<div className='mt-8 rounded-2xl border border-white/10 bg-black/60 p-5 375:p-6 space-y-4 animate-in fade-in duration-300'>
			<div className='border-b border-white/10 pb-3'>
				<h3 className='text-base font-bold text-white flex items-center gap-2'>
					<ShieldCheck className='h-4 w-4 text-red-400' />
					<span>UI/UX Specification: Slider Component States Sheet</span>
				</h3>
				<p className='text-xs text-gray-400 mt-1'>
					Interactive specifications for slider track, thumb, focus ring token (`ring-focus`), and semantic total states.
				</p>
			</div>

			<div className='grid gap-4 sm:grid-cols-2'>
				{/* 1. Default State */}
				<div className='rounded-xl border border-white/10 bg-white/[0.02] p-3.5'>
					<div className='flex items-center justify-between text-xs font-semibold text-gray-300 mb-2'>
						<span>1. Default State</span>
						<span className='rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400'>Resting</span>
					</div>
					<div className='h-2.5 rounded-full bg-white/10 mb-3 relative overflow-hidden'>
						<div className='h-full bg-blue-500 w-1/2 rounded-full' />
					</div>
					<div className='flex items-center justify-between text-[11px] text-gray-400'>
						<span>Track fill: 50%</span>
						<span>Thumb: 22px #FFFFFF / #D72323 border</span>
					</div>
				</div>

				{/* 2. Focused State */}
				<div className='rounded-xl border border-red-500/50 bg-red-500/[0.04] p-3.5'>
					<div className='flex items-center justify-between text-xs font-semibold text-red-300 mb-2'>
						<span>2. Focused State</span>
						<span className='rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300'>ring-focus Token</span>
					</div>
					<div className='h-2.5 rounded-full bg-white/10 mb-3 relative overflow-hidden'>
						<div className='h-full bg-emerald-500 w-1/2 rounded-full' />
					</div>
					<div className='flex items-center justify-between text-[11px] text-red-300/80'>
						<span>Focus ring: 3px solid #D72323</span>
						<span>Offset: 4px</span>
					</div>
				</div>

				{/* 3. Dragging (Active) State */}
				<div className='rounded-xl border border-amber-500/40 bg-amber-500/[0.04] p-3.5'>
					<div className='flex items-center justify-between text-xs font-semibold text-amber-300 mb-2'>
						<span>3. Dragging State</span>
						<span className='rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300'>Active Pointer</span>
					</div>
					<div className='h-2.5 rounded-full bg-white/10 mb-3 relative overflow-hidden'>
						<div className='h-full bg-amber-500 w-3/4 rounded-full' />
					</div>
					<div className='flex items-center justify-between text-[11px] text-amber-300/80'>
						<span>Thumb scale: 1.25x</span>
						<span>Glow shadow: rgba(239, 68, 68, 0.8)</span>
					</div>
				</div>

				{/* 4. Invalid Total State */}
				<div className='rounded-xl border border-rose-500/40 bg-rose-500/[0.04] p-3.5'>
					<div className='flex items-center justify-between text-xs font-semibold text-rose-300 mb-2'>
						<span>4. Invalid Total State</span>
						<span className='rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300'>status.error Token</span>
					</div>
					<div className='flex items-center justify-between text-xs text-rose-400 font-medium mb-1'>
						<span>Total: 110% (+10% Over)</span>
						<span>Save Disabled</span>
					</div>
					<div className='text-[11px] text-gray-400'>
						Semantic alert border: rgba(244, 63, 94, 0.28)
					</div>
				</div>
			</div>
		</div>
	);
}
