interface Bill {
    id: string;
    title: string;
    category: string;
    amount: number;
    dueDate: string;
    daysInfo: string;
    status: 'overdue' | 'urgent' | 'upcoming' | 'paid';
    isRecurring?: boolean;
    /** ISO date string for the next occurrence (recurring bills only) */
    nextOccurrence?: string;
    /** Human-readable recurrence label e.g. "Monthly" */
    recurrenceLabel?: string;
}