export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly';

export function computeNextRunAt(frequency: RecurringFrequency, from: Date): Date {
  if (!Number.isFinite(from.getTime())) {
    throw new Error('Invalid recurring run date');
  }

  const next = new Date(from);

  switch (frequency) {
    case 'weekly':
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case 'biweekly':
      next.setUTCDate(next.getUTCDate() + 14);
      break;
    case 'monthly': {
      const dayOfMonth = next.getUTCDate();
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + 1);
      const lastDayOfMonth = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
      ).getUTCDate();
      next.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
      break;
    }
    default:
      throw new Error(`Unsupported recurring frequency: ${frequency}`);
  }

  return next;
}
