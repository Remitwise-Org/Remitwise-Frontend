// In-memory mock DB for recurring remittances
import { RecurringRemittance } from '@/utils/types/recurringRemittance.types';

let recurringRemittances: RecurringRemittance[] = [];

function computeNextRunAt(from: Date, frequency: 'weekly' | 'biweekly' | 'monthly'): Date {
  const next = new Date(from);
  if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'biweekly') next.setDate(next.getDate() + 14);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  return next;
}

export function createRecurringRemittance(data: Omit<RecurringRemittance, 'id' | 'createdAt' | 'nextRunAt' | 'lastRunAt'>): RecurringRemittance {
  const id = crypto.randomUUID();
  const createdAt = new Date();
  const nextRunAt = computeNextRunAt(createdAt, data.frequency);
  const remittance: RecurringRemittance = {
    ...data,
    id,
    createdAt,
    nextRunAt,
  };
  recurringRemittances.push(remittance);
  return remittance;
}

export function getRecurringRemittances(userAddress: string): RecurringRemittance[] {
  return recurringRemittances.filter(r => r.userAddress === userAddress);
}

export function updateRecurringRemittance(id: string, updates: Partial<Omit<RecurringRemittance, 'id' | 'createdAt'>>): RecurringRemittance | null {
  const idx = recurringRemittances.findIndex(r => r.id === id);
  if (idx === -1) return null;
  const updated = {
    ...recurringRemittances[idx],
    ...updates,
  };
  if (updates.frequency) {
    updated.nextRunAt = computeNextRunAt(new Date(), updates.frequency);
  }
  recurringRemittances[idx] = updated;
  return updated;
}

export function deleteRecurringRemittance(id: string): boolean {
  const idx = recurringRemittances.findIndex(r => r.id === id);
  if (idx === -1) return false;
  recurringRemittances.splice(idx, 1);
  return true;
}
