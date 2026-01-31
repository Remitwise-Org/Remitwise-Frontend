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

const FamilyMemberStatCard: React.FC<FamilyMemberStatCardProps> = ({
	member,
}) => {
	const [copied, setCopied] = useState(false);

	const getRoleIcon = (role: FamilyMemberRole) => {
		switch (role) {
			case "Recipient":
				return <User className='h-3 w-3' />;
			case "Sender":
				return <Send className='h-3 w-3' />;
			case "Admin":
				return <ShieldCheck className='h-3 w-3' />;
			default:
				return null;
		}
	};

	const formatStellarId = (id: string) => {
		if (id.length <= 12) return id;
		return `${id.slice(0, 8)}XX...XXX${id.slice(-3)}`;
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

	return (
		<div className='rounded-2xl border border-[rgba(220,38,38,0.20)] bg-gradient-to-br from-[#1A0505] to-[#0F0505] p-6 shadow-xl'>
			<div className='flex justify-between items-start mb-6'>
				{/* Avatar with Glow */}
				<div className='relative'>
					<div className='absolute inset-0 rounded-xl bg-[#DC2626] blur-md opacity-20'></div>
					<div className='relative grid h-12 w-12 place-items-center rounded-xl bg-[#DC262633] border border-[#DC262644]'>
						<span className='text-xl font-bold text-white'>
							{member.initial}
						</span>
					</div>
				</div>

				{/* Role Badge */}
				<div className='flex items-center gap-1.5 rounded-lg bg-[#DC262622] px-3 py-1 border border-[#DC262633]'>
					<span className='text-[#DC2626]'>
						{getRoleIcon(member.role)}
					</span>
					<span className='text-[10px] font-semibold uppercase tracking-wider text-[#DC2626]'>
						{member.role}
					</span>
				</div>
			</div>

			{/* Name */}
			<h3 className='mb-4 text-lg font-semibold text-white'>
				{member.name}
			</h3>

			{/* Stellar ID */}
			<div className='mb-6 flex items-center gap-2'>
				<div className='flex-1 rounded-lg bg-black/40 border border-white/5 px-3 py-2'>
					<span className='text-[10px] font-mono text-gray-500 break-all'>
						{formatStellarId(member.stellarId)}
					</span>
				</div>
				<button
					onClick={handleCopy}
					className='grid h-9 w-9 place-items-center rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 active:scale-95'
					title='Copy Stellar ID'>
					{copied ? (
						<Check className='h-4 w-4 text-green-500' />
					) : (
						<Copy className='h-4 w-4 text-gray-400' />
					)}
				</button>
			</div>

			{/* Stats Box */}
			<div className='mb-6 rounded-xl bg-black/40 border border-white/5 p-4'>
				<div className='mb-2 flex justify-between items-center'>
					<div className='flex items-center gap-1.5 text-gray-500'>
						<span className='text-xs'>$</span>
						<span className='text-xs font-medium'>Spending Limit</span>
					</div>
					<span className='text-sm font-bold text-white'>
						${member.spendingLimit.toLocaleString()}
					</span>
				</div>

				<div className='mb-3 flex justify-between items-center'>
					<span className='text-[10px] text-gray-500'>
						Used: ${member.used.toLocaleString()}
					</span>
					<span className='text-[10px] text-gray-500'>
						{member.usedPercentage}%
					</span>
				</div>

				{/* Progress Bar */}
				<div className='h-1.5 w-full overflow-hidden rounded-full bg-white/5'>
					<div
						className='h-full bg-[#DC2626] shadow-[0_0_8px_rgba(220,38,38,0.5)] transition-all duration-500'
						style={{ width: `${member.usedPercentage}%` }}></div>
				</div>
			</div>

			{/* Actions */}
			<div className='flex gap-3'>
				<button className='flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-xs font-medium text-white hover:bg-white/10 transition-colors border border-white/5'>
					<Eye className='h-3.5 w-3.5' />
					View Details
				</button>
				<button className='flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-xs font-medium text-white hover:bg-white/10 transition-colors border border-white/5'>
					<Edit2 className='h-3.5 w-3.5' />
					Edit
				</button>
			</div>
		</div>
	);
};

export default FamilyMemberStatCard;
