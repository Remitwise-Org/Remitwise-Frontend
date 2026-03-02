import React from 'react';
import { BillCards } from './BillsCard';
import { mockBills } from '@/lib/mockdata/bills';



export function UnpaidBillsSection() {
    const unpaidStatuses: Bill['status'][] = ['overdue', 'urgent', 'upcoming'];

    const unpaidBills = mockBills.filter((bill) =>
        unpaidStatuses.includes(bill.status)
    );


    return (
        <div className="w-full max-w-7xl bg-[#010101] p-3 mx-auto flex flex-col gap-6 px-4 sm:px-2 lg:px-0">
            {/* Header */}
            <div className="flex flex-row justify-between items-center">
                <div className="flex flex-col gap-1">
                    <h2 className="font-bold text-2xl leading-8 tracking-[0.0703125px] text-white">
                        Unpaid Bills
                    </h2>
                    <p className="font-normal text-sm leading-5 tracking-[-0.150391px] text-white/40">
                        {unpaidBills.length} bills pending payment
                    </p>
                </div>
            </div>

            {/* Bills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-[19.67px]">
                {unpaidBills.map((bill) => {
                    return (
                        <BillCards key={bill.id} bill={bill} />
                    );
                })}
            </div>
        </div>
    );
};