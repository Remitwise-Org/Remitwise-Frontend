import React from 'react';
import { BillCards } from './BillsCard';
import { useDensity } from '@/lib/context/DensityContext';
import { Bill } from '@/lib/contracts/bill-payments';
import { WidgetEmptyState } from '@/components/ui/WidgetStates';

export function UnpaidBillsSection() {
    const { density } = useDensity();
    const unpaidStatuses: Bill['status'][] = ['overdue', 'urgent', 'upcoming'];

    const unpaidBills = bills.filter((bill) =>
        unpaidStatuses.includes(bill.status)
    );
    const recurringUnpaidCount = unpaidBills.filter((bill) => bill.isRecurring).length;

    // Group bills by status for visual urgency hierarchy
    const billsByStatus = unpaidBills.reduce((acc, bill) => {
        (acc[bill.status] = acc[bill.status] || []).push(bill);
        return acc;
    }, {} as Record<Bill['status'], Bill[]>);

    const statusOrder: Bill['status'][] = ['overdue', 'urgent', 'upcoming'];

    return (
        <div className="w-full max-w-7xl bg-[#010101] p-3 mx-auto flex flex-col gap-6 px-4 sm:px-2 lg:px-0">
            {/* Header */}
            <div className="flex flex-row justify-between items-center">
                <div className="flex flex-col gap-1">
                    <h2 className="font-bold text-2xl leading-8 tracking-[0.0703125px] text-white">
                        Unpaid Bills
                    </h2>
                    <p className="font-normal text-sm leading-5 tracking-[-0.150391px] text-white/40">
                        {unpaidBills.length} bills pending payment{recurringUnpaidCount > 0 ? ` - ${recurringUnpaidCount} recurring` : ''}
                    </p>
                </div>
            </div>
            {/* Bills Grid grouped by urgency */}
            {statusOrder.map((status) => {
                const bills = billsByStatus[status] ?? [];
                if (!bills.length) return null;
                const headerStyles: Record<string, string> = {
                    overdue: "text-red-400",
                    urgent: "text-amber-400",
                    upcoming: "text-white/60",
                    paid: "text-green-400",
                };
                return (
                    <section key={status} className="mb-4">
                        <h3 className={`text-lg font-semibold ${headerStyles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)} Bills</h3>
                        <div className={density === 'compact' ? "flex flex-col gap-2" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-[19.67px]"}>
                            {bills.map((bill) => (
                                <BillCards key={bill.id} bill={bill} density={density} />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};
