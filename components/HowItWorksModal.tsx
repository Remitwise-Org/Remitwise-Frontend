import React from "react";
import { AlertCircle } from "lucide-react";

const HowItWorks = () => {
	const data = [
		{ label: "Daily Spending", amount: "$500.00", percentage: "50%" },
		{ label: "Savings", amount: "$300.00", percentage: "30%" },
		{ label: "Bills", amount: "$150.00", percentage: "15%" },
		{ label: "Insurance", amount: "$50.00", percentage: "5%" },
	];

	return (
		<div className='flex  items-center justify-center '>
			{/* Outer How it Works card */}
			<div className='w-full  rounded-2xl border border-[rgba(220,38,38,0.20)] bg-gradient-to-br from-[#1A0505] to-[#0F0505] p-8 shadow-2xl'>
				<div className='flex items-start gap-4'>
					{/* Lucide icon + its container */}
					<div className='grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#DC262633]'>
						<AlertCircle className='h-5 w-5 text-[#DC2626]' />
					</div>

					<div className='flex-1'>
						<h2 className='mb-4 text-xl font-semibold text-white'>
							How It Works
						</h2>
						<p className='mb-8 text-sm leading-relaxed text-gray-400'>
							When you send a remittance, the amount is automatically
							split according to these percentages. Your family receives
							the money already organized into different wallets.
						</p>

						{/* Inner Content Box */}
						<div className='rounded-xl border border-[rgba(255,255,255,0.05)] bg-black/40 p-6'>
							<p className='mb-4 text-xs font-medium text-gray-500 uppercase tracking-wider'>
								Example: If you send $1,000
							</p>

							<div className='space-y-4'>
								{data.map((item, index) => (
									<div
										key={index}
										className='flex justify-between items-center'>
										<span className='text-sm text-gray-300'>
											{item.label}
										</span>
										<div className='text-right'>
											<span className='text-sm font-medium text-white'>
												{item.amount}
											</span>
											<span className='ml-2 text-sm text-gray-500'>
												({item.percentage})
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default HowItWorks;
