"use client";

import React, { useState } from "react";
import FamilyMemberStatCard, { FamilyMember } from "./FamilyMemberStatCard";
import FamilyMemberDetailDrawer from "./FamilyMemberDetailDrawer";
import { useClientTranslator } from "@/lib/i18n/client";

export const familyMembers: FamilyMember[] = [
	{
		id: "1",
		name: "Maria Santos",
		initial: "M",
		role: "Recipient",
		stellarId: "GDEMO1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
		spendingLimit: 500,
		used: 320,
		usedPercentage: 64,
	},
	{
		id: "2",
		name: "Carlos Santos",
		initial: "C",
		role: "Recipient",
		stellarId: "GDEMO2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
		spendingLimit: 300,
		used: 150,
		usedPercentage: 50,
	},
	{
		id: "3",
		name: "Juan Rodriguez",
		initial: "J",
		role: "Sender",
		stellarId: "GDEMO3XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
		spendingLimit: 2000,
		used: 1200,
		usedPercentage: 60,
	},
	{
		id: "4",
		name: "Ana Martinez",
		initial: "A",
		role: "Admin",
		stellarId: "GDEMO4XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
		spendingLimit: 5000,
		used: 0,
		usedPercentage: 0,
	},
];

export const getActiveMemberCount = () => familyMembers.length;

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

const FamilyMemberSection: React.FC = () => {
	const { t } = useClientTranslator();
	const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
	const activeCount = getActiveMemberCount();
	const totalLimit = familyMembers.reduce(
		(sum, member) => sum + member.spendingLimit,
		0
	);
	const totalUsed = familyMembers.reduce((sum, member) => sum + member.used, 0);
	const nearLimitCount = familyMembers.filter(
		(member) => member.usedPercentage >= 75
	).length;
	const orderedMembers = [...familyMembers].sort(
		(a, b) => b.usedPercentage - a.usedPercentage
	);

	return (
		<section className='space-y-6'>
			<div className='flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'>
				<div>
					<p className='text-xs font-semibold uppercase tracking-[0.24em] text-red-300'>
						{t("family_member_section.member_overview_label")}
					</p>
					<h2 className='mt-3 text-2xl font-semibold text-white'>
						{t("family_member_section.title")}
					</h2>
					<p className='mt-2 max-w-2xl text-sm leading-6 text-gray-300'>
						{t("family_member_section.description")}
					</p>
				</div>

				<div className='grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[540px]'>
					<div className='rounded-2xl border border-white/[0.08] bg-[#101010] p-4'>
						<p className='text-sm text-gray-400'>
							{t("family_member_section.stats.active_members_label")}
						</p>
						<p className='mt-2 text-2xl font-semibold text-white'>
							{activeCount}
						</p>
						<p className='mt-1 text-sm text-gray-500'>
							{t("family_member_section.stats.active_members_sub")}
						</p>
					</div>

					<div className='rounded-2xl border border-white/[0.08] bg-[#101010] p-4'>
						<p className='text-sm text-gray-400'>
							{t("family_member_section.stats.remaining_budget_label")}
						</p>
						<p className='mt-2 text-2xl font-semibold text-white'>
							{currencyFormatter.format(totalLimit - totalUsed)}
						</p>
						<p className='mt-1 text-sm text-gray-500'>
							{t("family_member_section.stats.remaining_budget_sub", {
								used: currencyFormatter.format(totalUsed)
							})}
						</p>
					</div>

					<div className='rounded-2xl border border-white/[0.08] bg-[#101010] p-4'>
						<p className='text-sm text-gray-400'>
							{t("family_member_section.stats.needs_review_label")}
						</p>
						<p className='mt-2 text-2xl font-semibold text-white'>
							{nearLimitCount}
						</p>
						<p className='mt-1 text-sm text-gray-500'>
							{t("family_member_section.stats.needs_review_sub")}
						</p>
					</div>
				</div>
			</div>

			<div className='flex flex-wrap gap-2'>
				<span className='rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-100'>
					{t("family_member_section.tags.highest_usage")}
				</span>
				<span className='rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-gray-300'>
					{t("family_member_section.tags.active_members", { count: activeCount })}
				</span>
				<span className='rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-gray-300'>
					{t("family_member_section.tags.total_limit", {
						limit: currencyFormatter.format(totalLimit)
					})}
				</span>
			</div>

			<div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
				{orderedMembers.map((member) => (
						<FamilyMemberStatCard
							key={member.id}
							member={member}
							onViewDetails={() => setSelectedMember(member)}
						/>
					))}
			</div>

			<FamilyMemberDetailDrawer
				member={selectedMember}
				open={selectedMember !== null}
				onClose={() => setSelectedMember(null)}
			/>
		</section>
	);
};

export default FamilyMemberSection;