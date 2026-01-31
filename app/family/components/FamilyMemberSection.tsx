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

const FamilyMemberSection: React.FC = () => {
	const activeCount = getActiveMemberCount();

	return (
		<section className='bg-black min-h-screen mb-8'>
			<div className='max-w-7xl mx-auto'>
				<div className='mb-8'>
					<h2 className='text-2xl font-bold text-white mb-1'>
						Family Members
					</h2>
					<p className='text-sm text-gray-500'>
						{activeCount} active members
					</p>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{familyMembers.map((member) => (
						<FamilyMemberStatCard
							key={member.id}
							member={member}
						/>
					))}
				</div>
			</div>
		</section>
	);
};

export default FamilyMemberSection;
