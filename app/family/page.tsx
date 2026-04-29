"use client";

import { useRef } from "react";
import PageHeader from "@/components/PageHeader";
import FamilyWalletsStatsCards from "./components/FamilyWalletsStatsCards";
import UnderstandingRolesSection from "./components/UnderstandingRolesSection";
import FamilyMemberSection from "./components/FamilyMemberSection";

export default function FamilyWallets() {
	const addMemberSectionRef = useRef<HTMLDivElement>(null);

	function handleAddMember() {
		addMemberSectionRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
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

			<main className='mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
				<section className='mb-8'>
					<FamilyWalletsStatsCards />
				</section>

				<div className='grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)] xl:items-start'>
					<div>
						<FamilyMemberSection />
					</div>

					<aside className='space-y-8 xl:sticky xl:top-6'>
						<UnderstandingRolesSection />

						<div
							ref={addMemberSectionRef}
							className='rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.96))] p-6 sm:p-8'>
							<div className='border-b border-white/[0.08] pb-6'>
								<p className='text-xs font-semibold uppercase tracking-[0.24em] text-red-300'>
									Member controls
								</p>
								<h2 className='mt-3 text-2xl font-semibold text-white'>
									Add Family Member
								</h2>
								<p className='mt-2 text-sm leading-6 text-gray-300'>
									The form is visually ready for engineering handoff and keeps
									the disabled state explicit until contract integration is
									connected.
								</p>
							</div>

							<form className='mt-6 space-y-6'>
								<div>
									<label className='mb-2 block text-sm font-medium text-gray-300'>
										Name
									</label>
									<input
										type='text'
										placeholder='Family member name'
										className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500'
										disabled
									/>
								</div>

								<div>
									<label className='mb-2 block text-sm font-medium text-gray-300'>
										Stellar Address
									</label>
									<input
										type='text'
										placeholder='GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
										className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 font-mono text-sm text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500'
										disabled
									/>
								</div>

								<div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
									<div>
										<label className='mb-2 block text-sm font-medium text-gray-300'>
											Role
										</label>
										<select
											className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white focus:border-transparent focus:ring-2 focus:ring-red-500'
											disabled>
											<option>Sender</option>
											<option>Recipient</option>
											<option>Admin</option>
										</select>
									</div>

									<div>
										<label className='mb-2 block text-sm font-medium text-gray-300'>
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
												className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-3 pl-8 pr-4 text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500'
												disabled
											/>
										</div>
									</div>
								</div>

								<button
									type='submit'
									className='w-full rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60'
									disabled>
									Add Member
								</button>
							</form>
						</div>

						<div className='rounded-2xl border border-amber-700/30 bg-amber-950/20 p-4'>
							<p className='text-sm leading-6 text-amber-100'>
								<strong className='font-semibold text-amber-50'>
									Integration required:
								</strong>{" "}
							Connect the `family_wallet` smart contract and wallet to add members, update spending limits, and enforce permissions non-custodially. Each change is prepared as an on-chain payload and signed locally.
							</p>
						</div>
					</aside>
				</div>
			</main>
		</div>
	);
}
