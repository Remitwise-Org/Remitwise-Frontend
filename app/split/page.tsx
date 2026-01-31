"use client";

import Link from "next/link";
import { Save, Info } from "lucide-react";
import SmartMoneySplitHeader from "@/components/SmartMoneySplitHeader";
import { useState } from "react";
import HowItWorks from "@/components/HowItWorksModal";

export default function SplitConfiguration() {
	const handleSaveConfiguration = () => {
		// TODO: Implement save logic (persist to localStorage or API)
		console.log("Configuration saved!");
	};
	return (
		<div className='min-h-screen bg-[#010101]'>
			<SmartMoneySplitHeader />

			<main className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
				<div className='bg-[#0f0f0f] border border-white/5 rounded-2xl shadow-xl p-8'>
					<div className='mb-8'>
						<h2 className='text-xl font-bold text-white mb-2'>
							Current Allocation
						</h2>
						<p className='text-gray-400'>
							Customize how your funds are distributed.
						</p>
					</div>

					{/* Split Configuration Form */}
					<form className='space-y-6'>
						<SplitInput
							label='Daily Spending'
							description='For immediate family expenses'
							value={50}
							color='bg-blue-500'
						/>
						<SplitInput
							label='Savings'
							description='Allocated to savings goals'
							value={30}
							color='bg-green-500'
						/>
						<SplitInput
							label='Bills'
							description='Automated bill payments'
							value={15}
							color='bg-yellow-500'
						/>
						<SplitInput
							label='Insurance'
							description='Micro-insurance premiums'
							value={5}
							color='bg-purple-500'
						/>

						<div className='bg-[#1a1a1a] rounded-xl p-6 border border-white/5'>
							<div className='flex items-center justify-between'>
								<span className='font-semibold text-gray-300'>
									Total
								</span>
								<span className='text-2xl font-bold text-white'>
									100%
								</span>
							</div>
						</div>

						<HowItWorks />

						<div className='flex space-x-4 pt-4'>
							<Link
								href='/'
								className='flex-1 bg-[#1a1a1a] text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-[#252525] transition text-center border border-white/5'>
								Cancel
							</Link>
							<button
								type='submit'
								onClick={handleSaveConfiguration}
								className='flex-1 bg-red-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-red-500 transition flex items-center justify-center space-x-2 bg-gradient-to-b from-red-600 to-red-700'
								disabled>
								<Save className='w-5 h-5' />
								<span>Save Configuration</span>
							</button>
						</div>
					</form>
				</div>

				{/* Integration Note */}
				<div className='mt-8 bg-amber-950/20 border border-amber-900/30 rounded-xl p-6'>
					<p className='text-sm text-amber-200/70'>
						<strong className='text-amber-200'>
							Integration Required:
						</strong>{" "}
						Connect to remittance_split smart contract to initialize and
						update split configuration. Validate that percentages sum to
						100% before submitting.
					</p>
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
}: {
	label: string;
	description: string;
	value: number;
	color: string;
}) {
	return (
		<div className='p-4 rounded-xl hover:bg-white/[0.02] transition-colors'>
			<div className='flex justify-between items-center mb-3'>
				<div>
					<label className='block text-sm font-medium text-white'>
						{label}
					</label>
					<p className='text-xs text-gray-500 mt-0.5'>{description}</p>
				</div>
				<div className='text-2xl font-bold text-white'>{value}%</div>
			</div>
			<div className='w-full bg-white/10 rounded-full h-2 mb-4'>
				<div
					className={`${color} h-2 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
					style={{ width: `${value}%` }}></div>
			</div>
			<input
				type='range'
				min='0'
				max='100'
				value={value}
				className='w-full accent-red-600 h-1'
				disabled
			/>
		</div>
	);
}
