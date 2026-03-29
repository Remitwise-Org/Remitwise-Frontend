import React, { useState } from "react";
import { Copy, Check, Eye, Edit2, User, Send, ShieldCheck } from "lucide-react";

export type FamilyMemberRole = "Recipient" | "Sender" | "Admin";

export interface FamilyMember {
	id: string;
	name: string;
	initial: string;
	role: FamilyMemberRole;
	stellarId: string;
	spendingLimit: number;
	used: number;
	usedPercentage: number;
}

interface FamilyMemberStatCardProps {
	member: FamilyMember;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

const FamilyMemberStatCard: React.FC<FamilyMemberStatCardProps> = ({
	member,
}) => {
	const [copied, setCopied] = useState(false);

	const getRoleMeta = (role: FamilyMemberRole) => {
		switch (role) {
			case "Recipient":
				return {
					icon: <User className='h-3.5 w-3.5' />,
					className:
						"border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-200",
				};
			case "Sender":
				return {
					icon: <Send className='h-3.5 w-3.5' />,
					className: "border-sky-500/30 bg-sky-500/[0.12] text-sky-200",
				};
			case "Admin":
				return {
					icon: <ShieldCheck className='h-3.5 w-3.5' />,
					className: "border-amber-500/30 bg-amber-500/[0.12] text-amber-100",
				};
			default:
				return {
					icon: null,
					className: "border-white/10 bg-white/[0.03] text-gray-200",
				};
		}
	};

	const getUsageMeta = (usedPercentage: number) => {
		if (usedPercentage >= 80) {
			return {
				label: "Approaching limit",
				textClass: "text-red-200",
				badgeClass: "border-red-500/30 bg-red-500/[0.12] text-red-100",
				barClass: "bg-gradient-to-r from-red-600 to-red-400",
				helper: "Review this member's allowance soon.",
			};
		}

		if (usedPercentage >= 40) {
			return {
				label: "On track",
				textClass: "text-amber-100",
				badgeClass: "border-amber-500/30 bg-amber-500/[0.12] text-amber-100",
				barClass: "bg-gradient-to-r from-amber-500 to-orange-400",
				helper: "Usage is within the expected range.",
			};
		}

		if (usedPercentage > 0) {
			return {
				label: "Low usage",
				textClass: "text-emerald-100",
				badgeClass:
					"border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-100",
				barClass: "bg-gradient-to-r from-emerald-500 to-emerald-300",
				helper: "This member still has plenty of budget available.",
			};
		}

		return {
			label: "Unused",
			textClass: "text-gray-300",
			badgeClass: "border-white/10 bg-white/[0.03] text-gray-200",
			barClass: "bg-white/10",
			helper: "No spending recorded yet this month.",
		};
	};

	const formatStellarId = (id: string) => {
		if (id.length <= 18) return id;
		return `${id.slice(0, 10)}...${id.slice(-6)}`;
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(member.stellarId);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

	const roleMeta = getRoleMeta(member.role);
	const usageMeta = getUsageMeta(member.usedPercentage);
	const remaining = Math.max(member.spendingLimit - member.used, 0);

	return (
		<article className='rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(36,11,11,0.92),rgba(13,13,13,0.98))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)]'>
			<div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
				<div className='flex items-start gap-4'>
					<div className='relative'>
						<div className='absolute inset-0 rounded-2xl bg-red-600/20 blur-md'></div>
						<div className='relative grid h-14 w-14 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10'>
							<span className='text-xl font-bold text-white'>
								{member.initial}
							</span>
						</div>
					</div>

					<div className='space-y-2'>
						<div className='flex flex-wrap items-center gap-2'>
							<h3 className='text-xl font-semibold text-white'>
								{member.name}
							</h3>
							<span
								className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${roleMeta.className}`}>
								{roleMeta.icon}
								{member.role}
							</span>
							<span
								className={`rounded-full border px-3 py-1 text-xs font-medium ${usageMeta.badgeClass}`}>
								{usageMeta.label}
							</span>
						</div>
						<p className='text-sm leading-6 text-gray-300'>
							Monthly wallet usage, remaining headroom, and permissions in
							one place.
						</p>
					</div>
				</div>

				<div className='rounded-2xl border border-white/10 bg-black/25 p-4 sm:min-w-[168px]'>
					<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
						Used this month
					</p>
					<p className='mt-3 text-3xl font-semibold tracking-tight text-white'>
						{currencyFormatter.format(member.used)}
					</p>
					<p className='mt-2 text-sm text-gray-400'>
						{member.usedPercentage}% of monthly limit
					</p>
				</div>
			</div>

			<div className='mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-4'>
				<div className='flex items-start justify-between gap-3'>
					<div className='min-w-0'>
						<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
							Stellar address
						</p>
						<p className='mt-2 break-all font-mono text-sm text-gray-200'>
							{formatStellarId(member.stellarId)}
						</p>
					</div>
					<button
						type='button'
						onClick={handleCopy}
						className='grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-gray-300 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]'
						title='Copy Stellar ID'
						aria-label={`Copy Stellar ID for ${member.name}`}>
						{copied ? (
							<Check className='h-4 w-4 text-emerald-400' />
						) : (
							<Copy className='h-4 w-4' />
						)}
					</button>
				</div>
			</div>

			<div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
				<div className='rounded-2xl border border-white/[0.08] bg-black/25 p-4'>
					<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
						Spending limit
					</p>
					<p className='mt-3 text-lg font-semibold text-white'>
						{currencyFormatter.format(member.spendingLimit)}
					</p>
				</div>
				<div className='rounded-2xl border border-white/[0.08] bg-black/25 p-4'>
					<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
						Spent
					</p>
					<p className='mt-3 text-lg font-semibold text-white'>
						{currencyFormatter.format(member.used)}
					</p>
				</div>
				<div className='rounded-2xl border border-white/[0.08] bg-black/25 p-4'>
					<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
						Remaining
					</p>
					<p className='mt-3 text-lg font-semibold text-white'>
						{currencyFormatter.format(remaining)}
					</p>
				</div>
			</div>

			<div className='mt-4 rounded-2xl border border-white/[0.08] bg-black/25 p-4'>
				<div className='flex flex-wrap items-center justify-between gap-2'>
					<p className='text-sm font-medium text-white'>Utilization</p>
					<p className={`text-sm ${usageMeta.textClass}`}>{usageMeta.helper}</p>
				</div>

				<div className='mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]'>
					<div
						className={`h-full rounded-full transition-all duration-500 ${usageMeta.barClass}`}
						style={{ width: `${member.usedPercentage}%` }}></div>
				</div>

				<div className='mt-3 flex items-center justify-between text-sm text-gray-400'>
					<span>0%</span>
					<span>{member.usedPercentage}%</span>
					<span>100%</span>
				</div>
			</div>

			<div className='mt-6 flex flex-col gap-3 sm:flex-row'>
				<button
					type='button'
					disabled
					className='flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-gray-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60'>
					<Eye className='h-3.5 w-3.5' />
					View Details
				</button>
				<button
					type='button'
					disabled
					className='flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60'>
					<Edit2 className='h-3.5 w-3.5' />
					Edit Limits
				</button>
			</div>

			<p className='mt-3 text-xs leading-5 text-gray-500'>
				Member actions will unlock after the wallet contract integration is
				connected.
			</p>
		</article>
	);
};

export default FamilyMemberStatCard;
