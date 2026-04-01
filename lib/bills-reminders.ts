import { getUnpaidBills } from './contracts/bill-payments';

export interface BillReminder {
  billId: string;
  name: string;
  amount: number;
  dueDate: string;
}

const REMINDER_DAYS = 7;

function isWithinReminderWindow(dateStr: string): boolean {
  if (!dateStr || Number.isNaN(Date.parse(dateStr))) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + REMINDER_DAYS);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return due.getTime() <= windowEnd.getTime();
}

/**
 * Returns unpaid bills that are due within the next REMINDER_DAYS (inclusive).
 * Overdue bills are included to ensure reminders surface until resolved.
 */
export async function getBillsDueSoon(walletAddress: string): Promise<BillReminder[]> {
  const bills = await getUnpaidBills(walletAddress);
  return bills
    .filter((bill) => bill.status === 'unpaid')
    .filter((bill) => isWithinReminderWindow(bill.dueDate))
    .map((bill) => ({
      billId: bill.id,
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.dueDate,
    }));
}

export const BILL_REMINDER_WINDOW_DAYS = REMINDER_DAYS;
