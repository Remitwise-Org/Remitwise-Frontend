"use client";

import { User, DollarSign } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import FamilyWalletsStatsCards from "./components/FamilyWalletsStatsCards";
import UnderstandingRolesSection from "./components/UnderstandingRolesSection";
import FamilyMemberSection from "./components/FamilyMemberSection";

export default function FamilyWallets() {
	function handleAddMember() {
		// TODO: Open add-member flow or modal
	}

	return (
		<div className='min-h-screen bg-[#010101]'>
			<PageHeader
				title='Family Wallets'
				subtitle='Manage members and permissions'
				ctaLabel='Add Member'
				onCtaClick={handleAddMember}
				showBottomDivider
			/>

			<main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8'>
				<section className='mb-8'>
					<FamilyWalletsStatsCards />
				</section>

				{/* Family Members */}
				<FamilyMemberSection />

				<section className='mb-8'>
					<UnderstandingRolesSection />
				</section>

				{/* Add Member Form */}
				<div className='bg-[#0f0f0f] rounded-xl border border-white/5 p-8'>
					<h2 className='text-xl font-bold text-white mb-6'>
						Add Family Member
					</h2>
					<form className='space-y-6'>
						<div>
							<label className='block text-sm font-medium text-gray-400 mb-2'>
								Name
							</label>
							<input
								type='text'
								placeholder='Family member name'
								className='w-full px-4 py-3 border border-white/10 rounded-lg bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent'
								disabled
							/>
						</div>

						<div>
							<label className='block text-sm font-medium text-gray-400 mb-2'>
								Stellar Address
							</label>
							<input
								type='text'
								placeholder='GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
								className='w-full px-4 py-3 border border-white/10 rounded-lg bg-[#1a1a1a] text-white placeholder-gray-500 font-mono text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent'
								disabled
							/>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<div>
								<label className='block text-sm font-medium text-gray-400 mb-2'>
									Role
								</label>
								<select
									className='w-full px-4 py-3 border border-white/10 rounded-lg bg-[#1a1a1a] text-white focus:ring-2 focus:ring-red-500 focus:border-transparent'
									disabled>
									<option>Sender</option>
									<option>Recipient</option>
									<option>Admin</option>
								</select>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-400 mb-2'>
									Spending Limit (USD)
								</label>
								<div className='relative'>
									<span className='absolute left-4 top-3 text-gray-500'>
										$
									</span>
									<input
										type='number'
										placeholder='1000.00'
										step='0.01'
										min='0'
										className='w-full pl-8 pr-4 py-3 border border-white/10 rounded-lg bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent'
										disabled
									/>
								</div>
							</div>
						</div>

						<button
							type='submit'
							className='w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-500 transition'
							disabled>
							Add Member
						</button>
					</form>
				</div>

				{/* Integration Note */}
				<div className='mt-6 bg-amber-950/30 border border-amber-800/50 rounded-lg p-4'>
					<p className='text-sm text-amber-200'>
						<strong>Integration Required:</strong> Connect to
						family_wallet smart contract to add members, update spending
						limits, and check permissions. Integrate with wallet
						connection to verify addresses.
					</p>
				</div>
			</main>
		</div>
	);
}

function MemberCard({
	name,
	role,
	address,
	spendingLimit,
}: {
	name: string;
	role: string;
	address: string;
	spendingLimit: number;
}) {
	const roleColors = {
		sender: "bg-blue-900/40 text-blue-300",
		recipient: "bg-green-900/40 text-green-300",
		admin: "bg-purple-900/40 text-purple-300",
	};

	return (
		<div className='bg-[#0f0f0f] rounded-xl border border-white/5 p-6'>
			<div className='flex items-center justify-between mb-4'>
				<div className='flex items-center space-x-3'>
					<div className='w-12 h-12 bg-blue-900/40 rounded-full flex items-center justify-center'>
						<User className='w-6 h-6 text-blue-400' />
					</div>
					<div>
						<h3 className='text-lg font-semibold text-white'>{name}</h3>
						<span
							className={`text-xs px-2 py-1 rounded ${roleColors[role as keyof typeof roleColors] || "bg-gray-700 text-gray-300"} capitalize`}>
							{role}
						</span>
					</div>
				</div>
			</div>

			<div className='space-y-2 mb-4'>
				<div className='text-xs text-gray-500'>Address</div>
				<div className='text-xs font-mono text-gray-400 break-all'>
					{address}
				</div>
			</div>

			<div className='flex items-center justify-between pt-4 border-t border-white/5'>
				<div className='flex items-center space-x-2 text-gray-400'>
					<DollarSign className='w-4 h-4' />
					<span className='text-sm'>Spending Limit</span>
				</div>
				<span className='font-semibold text-white'>${spendingLimit}</span>
			</div>

			<div className='mt-4 flex space-x-2'>
				<button
					className='flex-1 bg-white/10 text-gray-300 px-4 py-2 rounded-lg hover:bg-white/15 transition text-sm font-semibold'
					disabled>
					Edit
				</button>
				<button
					className='flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition text-sm font-semibold'
					disabled>
					View Details
				</button>
			</div>
		</div>
	);
}
