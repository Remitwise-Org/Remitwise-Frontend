"use client";

import React, { useState } from "react";
import { Copy, Check, Eye, Edit2, Lock, User, Send, ShieldCheck } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import UtilizationMeter from "@/components/ui/UtilizationMeter";
import { getThreshold } from "@/components/ui/UtilizationMeter";

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
	onViewDetails?: () => void;
	/** When true, limit-edit controls are disabled (pre-integration state). */
	editDisabled?: boolean;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

const FamilyMemberStatCard: React.FC<FamilyMemberStatCardProps> = ({
	member,
	onViewDetails,
	editDisabled = true,
}) => {
	const { t } = useClientTranslator();
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
		const threshold = getThreshold(usedPercentage);
		switch (threshold) {
			case "over-limit":
				return {
					panelBorderClass: "border-status-error-border",
				};
			case "near-limit":
				return {
					panelBorderClass: "border-status-warning-border",
				};
			default:
				return {
					panelBorderClass: "border-white/10",
				};
		}
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
	const remaining = member.spendingLimit - member.used;

	return (
		<article className={`rounded-3xl border border-white/10 ${usageMeta.panelBorderClass} bg-[linear-gradient(180deg,rgba(36,11,11,0.92),rgba(13,13,13,0.98))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)]`}>
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
								{t(`family_member_card.roles.${member.role.toLowerCase()}`)}
							</span>
							{getThreshold(member.usedPercentage) !== "ok" && (
								<span
									className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
										getThreshold(member.usedPercentage) === "over-limit"
											? "border-status-error-border bg-status-error-bg text-status-error-fg"
											: "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
									}`}>
									{getThreshold(member.usedPercentage) === "over-limit" ? "OVER" : "NEAR"}
								</span>
							)}
						</div>
						<p className='text-sm leading-6 text-gray-300'>
							{t("family_member_card.description")}
						</p>
					</div>
				</div>

				<div className='rounded-2xl border border-white/10 bg-black/25 p-4 sm:min-w-[168px]'>
					<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
						{t("family_member_card.used_this_month_label")}
					</p>
					<p className='mt-3 text-3xl font-semibold tracking-tight text-white'>
						{currencyFormatter.format(member.used)}
					</p>
					<p className='mt-2 text-sm text-gray-400'>
						{t("family_member_card.used_percentage", {
							percentage: member.usedPercentage
						})}
					</p>
				</div>
			</div>

			<div className='mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-4'>
				<div className='flex items-start justify-between gap-3'>
					<div className='min-w-0'>
						<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
							{t("family_member_card.stellar_address_label")}
						</p>
						<p className='mt-2 break-all font-mono text-sm text-gray-200'>
							{formatStellarId(member.stellarId)}
						</p>
					</div>
					<button
						type='button'
						onClick={handleCopy}
						className='grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-gray-300 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]'
						title={t("family_member_card.copy_stellar_title")}
						aria-label={t("family_member_card.copy_stellar_aria", {
							name: member.name
						})}>
						{copied ? (
							<Check className='h-4 w-4 text-emerald-400' />
						) : (
							<Copy className='h-4 w-4' />
						)}
					</button>
				</div>
			</div>

			<div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
				<div className='relative rounded-2xl border border-white/[0.08] bg-black/25 p-4'>
					<div className='flex items-center justify-between'>
						<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
							{t("family_member_card.spending_limit_label")}
						</p>
						<button
							type='button'
							disabled={editDisabled}
							onClick={editDisabled ? undefined : onViewDetails}
							title={editDisabled
								? t("family_member_card.edit_limit_disabled_tooltip")
								: t("family_member_card.edit_limit_tooltip")
							}
							aria-label={t("family_member_card.edit_limit_aria")}
							className='grid h-7 w-7 place-items-center rounded-lg text-gray-500 transition-colors hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-30 disabled:grayscale focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400'>
							{editDisabled ? (
								<Lock className='h-3.5 w-3.5' />
							) : (
								<Edit2 className='h-3.5 w-3.5' />
							)}
						</button>
					</div>
					<p className='mt-3 text-lg font-semibold text-white'>
						{currencyFormatter.format(member.spendingLimit)}
					</p>
				</div>
				<div className='rounded-2xl border border-white/[0.08] bg-black/25 p-4'>
					<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
						{t("family_member_card.spent_label")}
					</p>
					<p className='mt-3 text-lg font-semibold text-white'>
						{currencyFormatter.format(member.used)}
					</p>
				</div>
				<div className='rounded-2xl border border-white/[0.08] bg-black/25 p-4'>
					<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
						{t("family_member_card.remaining_label")}
					</p>
					<p className={`mt-3 text-lg font-semibold ${remaining < 0 ? "text-status-error-fg" : "text-white"}`}>
						{currencyFormatter.format(remaining)}
					</p>
				</div>
			</div>

			<UtilizationMeter
				percentage={member.usedPercentage}
				label={t("family_member_card.utilization_label")}
				ariaLabel={t("family_member_card.utilization_aria")}
			/>

			<div className='mt-6 flex flex-col gap-3 sm:flex-row'>
				<button
					type='button'
					onClick={onViewDetails}
					className='flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]'>
					<Eye className='h-3.5 w-3.5' />
					{t("family_member_card.view_details")}
				</button>
				<button
					type='button'
					disabled={editDisabled}
					onClick={editDisabled ? undefined : onViewDetails}
					title={editDisabled
						? t("family_member_card.edit_limit_disabled_tooltip")
						: t("family_member_card.edit_limit_tooltip")
					}
					aria-disabled={editDisabled}
					className='flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-50 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:bg-red-600/20 disabled:text-white/40 disabled:hover:bg-red-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]'>
					{editDisabled ? <Lock className='h-3.5 w-3.5' /> : <Edit2 className='h-3.5 w-3.5' />}
					{t("family_member_card.edit_limits")}
				</button>
			</div>
		</article>
	);
};

export default FamilyMemberStatCard;
