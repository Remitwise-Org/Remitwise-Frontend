import { getUnpaidBills } from './contracts/bill-payments';
import { computeUrgency, daysDiff, type BillUrgency } from './bills/urgency';
import { getBillStatusPresentation, type SemanticStatusPresentation } from './ui/status-semantics';

export interface BillReminder {
  billId: string;
  name: string;
  amount: number;
  dueDate: string;
  /** Derived urgency — use this for display; do not re-derive in UI components. */
  urgency: BillUrgency;
}

/** Reminder window in days (96 hours). Bills due within this window are surfaced. */
export const BILL_REMINDER_WINDOW_DAYS = 4;

function isWithinReminderWindow(dateStr: string): boolean {
  if (!dateStr || Number.isNaN(Date.parse(dateStr))) return false;
  // Include overdue bills (diff < 0) and bills due within the window.
  return daysDiff(dateStr) <= BILL_REMINDER_WINDOW_DAYS;
}

/**
 * Returns unpaid bills due within the next BILL_REMINDER_WINDOW_DAYS (inclusive).
 * Overdue bills are always included so reminders persist until resolved.
 */
export async function getBillsDueSoon(walletAddress: string): Promise<BillReminder[]> {
  const bills = await getUnpaidBills(walletAddress);
  return bills
    .filter((bill) => bill.status !== 'paid')
    .filter((bill) => isWithinReminderWindow(bill.dueDate))
    .map((bill) => ({
      billId: bill.id,
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.dueDate,
      urgency: computeUrgency(bill.dueDate),
    }));
}

/**
 * Returns the semantic presentation (icon, colors, label) for a reminder.
 * Always use this instead of deriving colors inline — keeps reminder UI
 * consistent with BillsCard and other status surfaces.
 */
export function getReminderPresentation(reminder: BillReminder): SemanticStatusPresentation {
  return getBillStatusPresentation(reminder.urgency);
}

/**
 * Returns human-readable copy for a reminder banner or notification.
 *
 * Anti-alert-fatigue rules applied:
 * - Overdue: highest urgency, named amount, direct CTA.
 * - Urgent (due today / ≤3 days): specific timing, no alarm language.
 * - Upcoming (4 days): low-key heads-up, no urgency styling.
 */
export function getReminderCopy(reminder: BillReminder): { title: string; body: string; cta: string } {
  const diff = daysDiff(reminder.dueDate);
  const amt = `$${reminder.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (diff < 0) {
    const days = Math.abs(diff);
    return {
      title: `${reminder.name} is overdue`,
      body: `${amt} was due ${days} day${days === 1 ? '' : 's'} ago. Pay now to avoid service interruption.`,
      cta: 'Pay now',
    };
  }
  if (diff === 0) {
    return {
      title: `${reminder.name} is due today`,
      body: `${amt} is due today.`,
      cta: 'Pay now',
    };
  }
  if (diff === 1) {
    return {
      title: `${reminder.name} is due tomorrow`,
      body: `${amt} is due tomorrow.`,
      cta: 'Review bill',
    };
  }
  return {
    title: `${reminder.name} due in ${diff} days`,
    body: `${amt} is due on ${reminder.dueDate}.`,
    cta: 'View bill',
  };
}
