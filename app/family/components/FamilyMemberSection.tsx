import React from "react";
import FamilyMemberStatCard, { FamilyMember } from "./FamilyMemberStatCard";

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
						Member overview
					</p>
					<h2 className='mt-3 text-2xl font-semibold text-white'>
						Family Members
					</h2>
					<p className='mt-2 max-w-2xl text-sm leading-6 text-gray-300'>
						Highest-utilization members surface first so limit reviews are
						faster on mobile and desktop alike.
					</p>
				</div>

				<div className='grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[540px]'>
					<div className='rounded-2xl border border-white/[0.08] bg-[#101010] p-4'>
						<p className='text-sm text-gray-400'>Active members</p>
						<p className='mt-2 text-2xl font-semibold text-white'>
							{activeCount}
						</p>
						<p className='mt-1 text-sm text-gray-500'>
							Currently assigned roles
						</p>
					</div>

					<div className='rounded-2xl border border-white/[0.08] bg-[#101010] p-4'>
						<p className='text-sm text-gray-400'>Remaining budget</p>
						<p className='mt-2 text-2xl font-semibold text-white'>
							{currencyFormatter.format(totalLimit - totalUsed)}
						</p>
						<p className='mt-1 text-sm text-gray-500'>
							{currencyFormatter.format(totalUsed)} used this month
						</p>
					</div>

					<div className='rounded-2xl border border-white/[0.08] bg-[#101010] p-4'>
						<p className='text-sm text-gray-400'>Needs review</p>
						<p className='mt-2 text-2xl font-semibold text-white'>
							{nearLimitCount}
						</p>
						<p className='mt-1 text-sm text-gray-500'>
							Members at 75% usage or higher
						</p>
					</div>
				</div>
			</div>

			<div className='flex flex-wrap gap-2'>
				<span className='rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-100'>
					Highest usage first
				</span>
				<span className='rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-gray-300'>
					{activeCount} active members
				</span>
				<span className='rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-gray-300'>
					{currencyFormatter.format(totalLimit)} total monthly limit
				</span>
			</div>

			<div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
				{orderedMembers.map((member) => (
						<FamilyMemberStatCard
							key={member.id}
							member={member}
						/>
					))}
			</div>
		</section>
	);
};

export default FamilyMemberSection;
