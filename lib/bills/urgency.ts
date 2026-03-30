/**
 * Derives bill urgency status and days-info label from a due date string.
 * Keeps mock data and API responses in sync with the same logic.
 */

export type BillUrgency = 'overdue' | 'urgent' | 'upcoming' | 'paid';

/** Returns days difference: negative = overdue, 0 = today, positive = future */
export function daysDiff(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  const now = new Date();
  // Compare calendar days only
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

export function computeUrgency(dueDateStr: string): BillUrgency {
  const diff = daysDiff(dueDateStr);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'urgent';
  return 'upcoming';
}

export function computeDaysInfo(dueDateStr: string): string {
  const diff = daysDiff(dueDateStr);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `${diff}d left`;
}
