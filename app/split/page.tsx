"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Save, ShieldCheck, Wallet, Clock3, Layers3 } from "lucide-react";
import SmartMoneySplitHeader from "@/components/SmartMoneySplitHeader";
import HowItWorks from "@/components/HowItWorksModal";
import AsyncOperationsPanel from "@/components/AsyncOperationsPanel";
import AsyncSubmissionStatus from "@/components/AsyncSubmissionStatus";
import { DEFAULT_SPLIT_CONFIG, type SplitConfig } from "@/lib/remittance/split";
import { validatePercentages } from "@/lib/validation/percentages";

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
	const [allocation, setAllocation] = useState<SplitConfig>(DEFAULT_SPLIT_CONFIG);
	const [pending, setPending] = useState(false);
	const [submissionError, setSubmissionError] = useState<string | undefined>();
	const [submissionSuccess, setSubmissionSuccess] = useState<string | undefined>();
	const [showHowItWorks, setShowHowItWorks] = useState(false);

	const validationResult = useMemo(() => {
		try {
			validatePercentages(allocation);
			return { valid: true, message: undefined };
		} catch (e) {
			return {
				valid: false,
				message: e instanceof Error ? e.message : "Allocation must sum to 100%",
			};
		}
	}, [allocation]);

	const total = computeTotal(allocation);
	const isValid = validationResult.valid;

	const handleChange = (key: AllocationKey, value: number) => {
		setAllocation((prev) => ({ ...prev, [key]: value }));
		setSubmissionError(undefined);
		setSubmissionSuccess(undefined);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isValid || pending) return;

		setPending(true);
		setSubmissionError(undefined);
		setSubmissionSuccess(undefined);

		// No contract submission in this phase — simulate async round-trip
		await new Promise((resolve) => setTimeout(resolve, 800));
		setPending(false);
		setSubmissionSuccess("Split configuration saved. Changes will apply to your next remittance.");
	};

	return (
		<div className='min-h-screen bg-[#010101] safari-safe-bottom'>
			<SmartMoneySplitHeader />

			<main className='mx-auto max-w-7xl px-5 320:px-6 375:px-7 sm:px-6 lg:px-8 py-7 375:py-8 sm:py-8'>
				<div className='grid gap-7 375:gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start'>
					<div className='rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-5 320:p-6 375:p-7 sm:p-8'>
						<div className='border-b border-white/[0.08] pb-5 375:pb-6'>
							<p className='text-xs font-semibold uppercase tracking-[0.24em] text-red-300'>
								Allocation editor
							</p>
							<h2 className='mt-3 text-xl 375:text-2xl font-semibold text-white'>
								Current Allocation
							</h2>
							<p className='mt-2 text-sm 375:text-base leading-6 text-gray-300'>
								Customize how your remittances are distributed, then keep the
								contract submission states anchored to the same area so the
								workflow never feels detached.
							</p>
						</div>

						<p className='mt-3 text-sm leading-6 text-gray-300'>
							Allocation changes are saved as a USDC smart contract action. The payload is prepared in-app and the wallet signs it locally.
						</p>

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
								color='bg-blue-500'
								onChange={(v) => handleChange("spending", v)}
							/>
							<SplitInput
								label='Savings'
								description='Allocated to savings goals'
								value={allocation.savings}
								color='bg-green-500'
								onChange={(v) => handleChange("savings", v)}
							/>
							<SplitInput
								label='Bills'
								description='Automated bill payments'
								value={allocation.bills}
								color='bg-yellow-500'
								onChange={(v) => handleChange("bills", v)}
							/>
							<SplitInput
								label='Insurance'
								description='Micro-insurance premiums'
								value={allocation.insurance}
								color='bg-violet-500'
								onChange={(v) => handleChange("insurance", v)}
							/>

							{/* Live total with inline validation */}
							<div
								className={`rounded-2xl border p-4 375:p-5 transition-colors duration-200 ${
									isValid
										? "border-emerald-500/30 bg-emerald-500/[0.06]"
										: total > 100
											? "border-red-500/30 bg-red-500/[0.06]"
											: "border-white/[0.08] bg-[#141414]"
								}`}
								aria-live='polite'
								aria-atomic='true'
							>
								<div className='flex items-center justify-between gap-4'>
									<div className='min-w-0'>
										<p className='text-sm font-medium text-gray-300'>Total</p>
										{isValid ? (
											<p className='mt-1 text-xs 375:text-sm text-emerald-400'>
												Ready to submit
											</p>
										) : (
											<p
												className='mt-1 text-xs 375:text-sm text-amber-400'
												role='alert'
											>
												{validationResult.message}
											</p>
										)}
									</div>
									<span
										className={`flex-shrink-0 text-2xl 375:text-3xl font-semibold tabular-nums transition-colors duration-200 ${
											isValid
												? "text-emerald-400"
												: total > 100
													? "text-red-400"
													: "text-white"
										}`}
										aria-label={`Total allocation: ${total} percent`}
									>
										{total}%
									</span>
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
								<Link
									href='/'
									className='touch-target-wide flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3.5 text-center text-sm 375:text-base font-semibold text-white transition hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]'>
									Cancel
								</Link>
								<button
									type='submit'
									className='touch-target-wide flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3.5 text-sm 375:text-base font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-60'
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
	onChange,
}: {
	label: string;
	description: string;
	value: number;
	color: string;
	onChange: (value: number) => void;
}) {
	const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(Number(e.target.value));
	};

	const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = parseInt(e.target.value, 10);
		if (!Number.isFinite(raw)) return;
		onChange(Math.min(100, Math.max(0, raw)));
	};

	const inputId = `split-${label.toLowerCase().replace(/\s+/g, "-")}`;

	return (
		<div className='rounded-2xl border border-white/[0.08] bg-black/20 p-4 375:p-5 transition-colors hover:bg-white/[0.02]'>
			<div className='mb-3 flex items-center justify-between gap-4'>
				<div className='min-w-0'>
					<label
						htmlFor={inputId}
						className='block text-sm 375:text-base font-medium text-white'
					>
						{label}
					</label>
					<p className='mt-0.5 text-xs 375:text-sm text-gray-500'>{description}</p>
				</div>
				<div className='flex flex-shrink-0 items-center gap-0.5'>
					<input
						type='number'
						min='0'
						max='100'
						step='1'
						value={value}
						onChange={handleNumber}
						className='w-14 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-right text-xl 375:text-2xl font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
						aria-label={`${label} percentage`}
					/>
					<span className='text-xl 375:text-2xl font-semibold text-white' aria-hidden='true'>
						%
					</span>
				</div>
			</div>
			<div className='mb-4 h-2 w-full rounded-full bg-white/10' aria-hidden='true'>
				<div
					className={`${color} h-2 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-150`}
					style={{ width: `${value}%` }}
				/>
			</div>
			<input
				id={inputId}
				type='range'
				min='0'
				max='100'
				step='1'
				value={value}
				onChange={handleSlider}
				className='h-11 w-full accent-red-600 touch-target'
				aria-label={`${label} slider`}
				aria-valuetext={`${value} percent`}
				aria-valuenow={value}
				aria-valuemin={0}
				aria-valuemax={100}
			/>
		</div>
	);
}
