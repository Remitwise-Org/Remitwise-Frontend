"use client";

import { useRef } from "react";
import { useClientTranslator } from '@/lib/i18n/client'
import PageHeader from "@/components/PageHeader";
import FamilyWalletsStatsCards from "./components/FamilyWalletsStatsCards";
import UnderstandingRolesSection from "./components/UnderstandingRolesSection";
import FamilyMemberSection from "./components/FamilyMemberSection";
import ApprovalsQueue from "./components/ApprovalsQueue";

export default function FamilyWallets() {
	const { t } = useClientTranslator();
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
				title={t("family_wallets.page_title")}
				subtitle={t("family_wallets.page_subtitle")}
				ctaLabel={t("family_wallets.add_member_cta")}
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
						<ApprovalsQueue />

						<UnderstandingRolesSection />

						<div
							ref={addMemberSectionRef}
							className='rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.96))] p-6 sm:p-8'>
							<div className='border-b border-white/[0.08] pb-6'>
								<p className='text-xs font-semibold uppercase tracking-[0.24em] text-red-300'>
									{t("family_wallets.member_controls_label")}
								</p>
								<h2 className='mt-3 text-2xl font-semibold text-white'>
									{t("family_wallets.add_member_title")}
								</h2>
								<p className='mt-2 text-sm leading-6 text-gray-300'>
									{t("family_wallets.add_member_description")}
								</p>
							</div>

							<form className='mt-6 space-y-6'>
								<div>
									<label className='mb-2 block text-sm font-medium text-gray-300'>
										{t("family_wallets.form.name_label")}
									</label>
									<input
										type='text'
										placeholder={t("family_wallets.form.name_placeholder")}
										className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500'
										disabled
									/>
								</div>

								<div>
									<label className='mb-2 block text-sm font-medium text-gray-300'>
										{t("family_wallets.form.stellar_address_label")}
									</label>
									<input
										type='text'
										placeholder={t("family_wallets.form.stellar_address_placeholder")}
										className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 font-mono text-sm text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500'
										disabled
									/>
								</div>

								<div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
									<div>
										<label className='mb-2 block text-sm font-medium text-gray-300'>
											{t("family_wallets.form.role_label")}
										</label>
										<select
											className='w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white focus:border-transparent focus:ring-2 focus:ring-red-500'
											disabled>
											<option>{t("family_wallets.form.role_sender")}</option>
											<option>{t("family_wallets.form.role_recipient")}</option>
											<option>{t("family_wallets.form.role_admin")}</option>
										</select>
									</div>

									<div>
										<label className='mb-2 block text-sm font-medium text-gray-300'>
											{t("family_wallets.form.spending_limit_label")}
										</label>
										<div className='relative'>
											<span className='absolute left-4 top-3 text-gray-500'>
												$
											</span>
											<input
												type='number'
												placeholder={t("family_wallets.form.spending_limit_placeholder")}
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
									{t("family_wallets.form.submit_button")}
								</button>
							</form>
						</div>

						<div className='rounded-2xl border border-amber-700/30 bg-amber-950/20 p-4'>
							<p className='text-sm leading-6 text-amber-100'>
								<strong className='font-semibold text-amber-50'>
									{t("family_wallets.integration_required_label")}
								</strong>{" "}
								{t("family_wallets.integration_required_text")}
							</p>
						</div>
					</aside>
				</div>
			</main>
		</div>
	);
}