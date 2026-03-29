import { AlertCircle, Check, CheckCircle, Clock4, Repeat, Zap } from "lucide-react";





const getStatusStyles = (status: Bill['status']) => {
    switch (status) {
        case 'overdue':
            return {
                border: 'border-red-600/40',
                glow: 'bg-red-600/10',
                badgeBg: 'bg-red-600/30',
                badgeBorder: 'border-red-600/50',
                badgeText: 'text-red-600',
                dueBg: 'bg-red-600/20',
                dueBorder: 'border-red-600/30',
                dueIcon: 'text-red-600',
                dueText: 'text-red-600',
            };
        case 'urgent':
            return {
                border: 'border-red-400/30',
                glow: 'bg-red-600/5',
                badgeBg: 'bg-red-600/20',
                badgeBorder: 'border-red-600/30',
                badgeText: 'text-red-600',
                dueBg: 'bg-red-400/10',
                dueBorder: 'border-red-400/20',
                dueIcon: 'text-red-400',
                dueText: 'text-red-400',
            };
        case 'upcoming':
            return {
                border: 'border-white/[0.08]',
                glow: 'bg-red-600/5',
                badgeBg: 'bg-red-600/20',
                badgeBorder: 'border-red-600/30',
                badgeText: 'text-red-600',
                dueBg: 'bg-white/5',
                dueBorder: 'border-white/[0.08]',
                dueIcon: 'text-white/40',
                dueText: 'text-white/70',
            };

        case 'paid':
            return {
                border: 'border-white/10',
                glow: 'bg-red-600/5',
                badgeBg: 'bg-red-600/20',
                badgeBorder: 'border-red-600/30',
                badgeText: 'text-red-600',
                dueBg: 'bg-white/5',
                dueBorder: 'border-white/[0.08]',
                dueIcon: 'text-white/40',
                dueText: 'text-white/70',
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
                    <div className="flex gap-1 items-center">
                        {bill.status === "paid" && (
                            <CheckCircle className={`${styles.badgeText} w-3 h-3`} />
                        )}
                        <span className={`text-[10px] font-semibold ${styles.badgeText} uppercase`}>
                            {bill.status}
                        </span>
                    </div>
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
                        {bill.status === "paid" &&
                            <div
                                className={`flex flex-row items-center px-2 py-0 gap-1 mb-2 h-[26px] rounded-[10px] border ${styles.badgeBorder} ${styles.badgeBg}`}
                            >
                                <CheckCircle fontSize={"12px"} className={`${styles.badgeText} w-3 h-3`} />

                                <span className={`font-semibold text-xs leading-4 ${styles.badgeText} whitespace-nowrap`}>
                                    Paid
                                </span>

                            </div>
                        }
                        <div
                            className={`flex flex-row items-center px-2 py-0 gap-1 h-[26px] rounded-[10px] border 
                                ${bill.status === "paid" ? "!bg-transparent !border-white/10 !text-white/40" : ""} 
                                ${styles.badgeBorder} ${styles.badgeBg}`}
                        >
                            {bill.isRecurring ? (
                                // Recurring Icon
                                <Repeat fontSize={"12px"} className={`${styles.badgeText} ${bill.status === "paid" ? "!text-white/40" : ""}  w-3 h-3`} />
                            ) : (
                                // Overdue Icon
                                <AlertCircle className={`${styles.badgeText} w-3 h-3`} />
                            )}
                            <span className={`font-semibold text-xs leading-4 ${styles.badgeText}  ${bill.status === "paid" ? "!text-white/40" : ""}  whitespace-nowrap`}>
                                {bill.isRecurring ? 'Recurring' : 'Overdue'}
                            </span>

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
                    <Clock4 className={`${styles.dueIcon} w-3 h-3`} />

                    <div className="flex flex-col flex-1">
                        <span className="font-normal text-xs leading-4 text-white/50">
                            Due Date
                        </span>
                        <span className="font-semibold text-sm leading-5 tracking-[-0.150391px] text-white">
                            {bill.dueDate}
                        </span>
                    </div>

                    <span className={`font-semibold text-xs leading-4 text-right ${styles.dueText} whitespace-nowrap`}>
                        {bill.daysInfo}
                    </span>
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