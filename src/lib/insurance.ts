/**
 * Insurance reminders: policies where nextPaymentDate is within the next 7 days
 * or in the past (overdue). Can be backed by contract getActivePolicies (filtered)
 * or getOverduePolicies, or by DB when reminders are stored for push/email.
 *
 * Optional: add a cron job that calls getRemindersForWallet for each active user,
 * stores reminders in DB, and triggers push/email notifications.
 */

export interface InsuranceReminder {
  policyId: string;
  name: string;
  nextPaymentDate: string; // ISO date
  monthlyPremium: number;
}

const REMINDER_DAYS = 7;

function isWithinReminderWindow(dateStr: string): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + REMINDER_DAYS);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return due.getTime() <= windowEnd.getTime();
}

/**
 * Mock active policies. Replace with contract call getActivePolicies(walletAddress)
 * and filter by nextPaymentDate; or use getOverduePolicies if added to contract.
 */
function getMockActivePolicies(_walletAddress: string): InsuranceReminder[] {
  const today = new Date();
  const past = new Date(today);
  past.setDate(past.getDate() - 2);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 5);
  return [
    {
      policyId: '1',
      name: 'Health Insurance',
      nextPaymentDate: past.toISOString().slice(0, 10),
      monthlyPremium: 20,
    },
    {
      policyId: '2',
      name: 'Emergency Coverage',
      nextPaymentDate: soon.toISOString().slice(0, 10),
      monthlyPremium: 15,
    },
  ];
}

/**
 * Returns policies that need a reminder: nextPaymentDate within next 7 days or overdue.
 */
export function getRemindersForWallet(walletAddress: string): InsuranceReminder[] {
  const policies = getMockActivePolicies(walletAddress);
  return policies.filter((p) => isWithinReminderWindow(p.nextPaymentDate));
}
