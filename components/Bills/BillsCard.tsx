import { CalendarClock, CheckCircle, Repeat, Zap } from "lucide-react";
import { getBillStatusPresentation } from "@/lib/ui/status-semantics";

const getStatusStyles = (status: Bill['status']) => {
    switch (status) {
        case 'overdue':
            return {
                border: 'border-status-error-border',
                glow: 'bg-red-600/10',
                dueBg: 'bg-status-error-soft',
                dueBorder: 'border-status-error-border',
            };
        case 'urgent':
            return {
                border: 'border-status-warning-border',
                glow: 'bg-red-600/5',
                dueBg: 'bg-status-warning-soft',
                dueBorder: 'border-status-warning-border',
            };
        case 'upcoming':
            return {
                border: 'border-status-info-border',
                glow: 'bg-red-600/5',
                dueBg: 'bg-status-info-soft',
                dueBorder: 'border-status-info-border',
            };

        case 'paid':
            return {
                border: 'border-status-success-border',
                glow: 'bg-red-600/5',
                dueBg: 'bg-status-success-soft',
                dueBorder: 'border-status-success-border',
            };
    }
};


export function BillCards({ 
    bill,
    density = 'comfortable'
}: { 
    bill: Bill,
    density?: 'comfortable' | 'compact'
}) {
    const styles = getStatusStyles(bill.status);
    const statusPresentation = getBillStatusPresentation(bill.status);
    const StatusIcon = statusPresentation.icon;

    if (density === 'compact') {
        return (
            <div
                key={bill.id}
                className={`relative rounded-xl border ${styles.border} overflow-hidden px-4 py-3 mb-2 flex items-center justify-between gap-4`}
                style={{
                    background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
                }}
            >
                <div className="flex flex-col flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-white truncate">
                        {bill.title}
                    </h3>
                    <span className="text-xs text-white/40 truncate">
                        {bill.category} • Due {bill.dueDate}
                    </span>
                </div>

                <div className="flex flex-col items-end">
                    <span className="font-bold text-lg text-white">
                        ${bill.amount}
                    </span>
                    <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusPresentation.badgeClassName}`}>
                        <StatusIcon className="h-3 w-3" />
                        <span>{statusPresentation.label}</span>
                    </div>
                    <span className={`mt-1 text-[11px] font-medium ${statusPresentation.metaClassName}`}>
                        {statusPresentation.emphasis}
                    </span>
                </div>

                {bill.status !== "paid" && (
                    <button
                        className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white"
                        title="Pay Now"
                    >
                        <Zap className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            key={bill.id}
            className={`relative rounded-2xl border ${styles.border} overflow-hidden`}
            style={{
                background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
            }}
        >

            {/* Content */}
            <div className="relative flex flex-col gap-4 p-6">
                {/* Header with Title and Badge */}
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col gap-1 flex-1">
                        <h3 className="font-bold text-lg leading-7 tracking-[-0.439453px] text-white">
                            {bill.title}
                        </h3>
                        <span className="font-normal text-xs leading-4 text-white/40">
                            {bill.category}
                        </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end">
                        <div
                            className={`inline-flex h-[26px] items-center gap-1 rounded-[10px] border px-2 py-0 ${statusPresentation.badgeClassName}`}
                        >
                            <StatusIcon className="h-3 w-3" />
                            <span className="whitespace-nowrap text-xs font-semibold leading-4">
                                {statusPresentation.label}
                            </span>
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-white/65">
                            {bill.isRecurring ? <Repeat className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                            <span>{bill.isRecurring ? "Recurring charge" : "One-time charge"}</span>
                        </div>

                    </div>
                </div>

                {/* Amount */}
                <div className="w-full">
                    <span className="font-bold text-4xl leading-10 tracking-[0.369141px] text-white">
                        ${bill.amount}
                    </span>
                </div>

                {/* Due Date Info */}
                <div
                    className={`flex flex-row items-center px-3 gap-2 h-[62px] mt-auto rounded-[10px] border ${styles.dueBorder} ${styles.dueBg}`}
                >
                    <StatusIcon className={`h-4 w-4 ${statusPresentation.metaClassName}`} />

                    <div className="flex flex-col flex-1">
                        <span className="font-normal text-xs leading-4 text-white/50">
                            Due Date
                        </span>
                        <span className="font-semibold text-sm leading-5 tracking-[-0.150391px] text-white">
                            {bill.dueDate}
                        </span>
                    </div>

                    <div className="text-right">
                        <div className={`font-semibold text-xs leading-4 whitespace-nowrap ${statusPresentation.metaClassName}`}>
                            {statusPresentation.emphasis}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-white/55">
                            {bill.daysInfo}
                        </div>
                    </div>
                </div>

                {/* Pay Now Button */}
                {bill.status !== "paid" &&
                    <button
                        className="w-full h-10 rounded-[14px] flex items-center justify-center gap-2"
                        style={{
                            background: 'linear-gradient(180deg, #DC2626 0%, #B91C1C 100%)',
                            boxShadow: '0px 10px 15px -3px rgba(220, 38, 38, 0.2), 0px 4px 6px -4px rgba(220, 38, 38, 0.2)',
                        }}
                    >
                        {/* Lightning Icon */}
                        <Zap className="w-4 h-4" />
                        <span className="font-semibold text-sm leading-5 tracking-[-0.150391px] text-white">
                            Pay Now
                        </span>
                    </button>}
            </div>
        </div>
    )
}
