"use client";

import React, { useState } from "react";
import { Copy, Check, Eye, Edit2, User, Send, ShieldCheck } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";

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
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

const FamilyMemberStatCard: React.FC<FamilyMemberStatCardProps> = ({
	member,
	onViewDetails,
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
		if (usedPercentage >= 100) {
			return {
				label: t("family_member_card.usage_status.over_limit"),
				textClass: "text-status-error-fg",
				badgeClass: "border-status-error-border bg-status-error-bg text-status-error-fg",
				barClass: "bg-status-error-fg",
				panelBorderClass: "border-status-error-border",
				helper: t("family_member_card.usage_status.over_limit_helper"),
			};
		}

		if (usedPercentage >= 75) {
			return {
				label: t("family_member_card.usage_status.near_limit"),
				textClass: "text-status-warning-fg",
				badgeClass: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
				barClass: "bg-status-warning-fg",
				panelBorderClass: "border-status-warning-border",
				helper: t("family_member_card.usage_status.near_limit_helper"),
			};
		}

		return {
			label: t("family_member_card.usage_status.on_track"),
			textClass: "text-status-success-fg",
			badgeClass: "border-status-success-border bg-status-success-bg text-status-success-fg",
			barClass: "bg-status-success-fg",
			panelBorderClass: "border-white/[0.08]",
			helper: usedPercentage > 0
				? t("family_member_card.usage_status.within_range_helper")
				: t("family_member_card.usage_status.no_usage_helper"),
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
	const remaining = member.spendingLimit - member.used;

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
								{t(`family_member_card.roles.${member.role.toLowerCase()}`)}
							</span>
							<span
								className={`rounded-full border px-3 py-1 text-xs font-medium ${usageMeta.badgeClass}`}>
								{usageMeta.label}
							</span>
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
				<div className='rounded-2xl border border-white/[0.08] bg-black/25 p-4'>
					<p className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
						{t("family_member_card.spending_limit_label")}
					</p>
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

			<div className={`mt-4 rounded-2xl border bg-black/25 p-4 ${usageMeta.panelBorderClass}`}>
				<div className='flex flex-wrap items-center justify-between gap-2'>
					<p className='text-sm font-medium text-white'>
						{t("family_member_card.utilization_label")}
					</p>
					<p className={`text-sm ${usageMeta.textClass}`}>{usageMeta.helper}</p>
				</div>

				<div className='mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]' role="progressbar" aria-valuenow={Math.min(member.usedPercentage, 100)} aria-valuemin={0} aria-valuemax={100}>
					<div
						className={`h-full rounded-full transition-all duration-500 ${usageMeta.barClass}`}
						style={{ width: `${Math.min(member.usedPercentage, 100)}%` }}></div>
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
					onClick={onViewDetails}
					className='flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/[0.08]'>
					<Eye className='h-3.5 w-3.5' />
					{t("family_member_card.view_details")}
				</button>
				<button
					type='button'
					onClick={onViewDetails}
					className='flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-50 transition-colors hover:bg-red-500/20'>
					<Edit2 className='h-3.5 w-3.5' />
					Edit Limits
				</button>
			</div>
		</article>
	);
};

export default FamilyMemberStatCard;