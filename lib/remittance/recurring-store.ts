import { RecurringRemittance } from '@/utils/types/recurringRemittance.types';
import { StrKey } from '@stellar/stellar-sdk';

/**
 * Interface representing a database-swap-ready contract for recurring remittance schedules.
 */
export interface IRecurringRemittanceStore {
  create(data: {
    userAddress: string;
    recipientAddress: string;
    amount: number;
    currency: string;
    frequency: 'weekly' | 'biweekly' | 'monthly';
  }): Promise<RecurringRemittance>;

  list(userAddress: string): Promise<RecurringRemittance[]>;

  get(id: string): Promise<RecurringRemittance | null>;

  update(
    id: string,
    updates: {
      recipientAddress?: string;
      amount?: number;
      currency?: string;
      frequency?: 'weekly' | 'biweekly' | 'monthly';
    }
  ): Promise<RecurringRemittance | null>;

  delete(id: string): Promise<boolean>;

  clear(): Promise<void>;
}

/**
 * Centralized input validation for recurring remittance schedules.
 */
export function validateRecurringRemittanceInput(data: {
  recipientAddress?: string;
  amount?: number;
  currency?: string;
  frequency?: string;
}) {
  if (data.recipientAddress !== undefined && !StrKey.isValidEd25519PublicKey(data.recipientAddress)) {
    throw new Error('Invalid recipientAddress');
  }
  if (data.amount !== undefined && (typeof data.amount !== 'number' || data.amount <= 0)) {
    throw new Error('Invalid amount');
  }
  if (data.currency !== undefined && (!data.currency || typeof data.currency !== 'string')) {
    throw new Error('Invalid currency');
  }
  if (data.frequency !== undefined && !['weekly', 'biweekly', 'monthly'].includes(data.frequency)) {
    throw new Error('Invalid frequency');
  }
}

function computeNextRunAt(from: Date, frequency: 'weekly' | 'biweekly' | 'monthly'): Date {
  const next = new Date(from);
  if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'biweekly') next.setDate(next.getDate() + 14);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  return next;
}

/**
 * In-memory implementation of the recurring remittance store.
 * Marked clearly as in-memory to differentiate from future persistent databases.
 */
export class InMemoryRecurringRemittanceStore implements IRecurringRemittanceStore {
  private schedules: RecurringRemittance[] = [];

  async create(data: {
    userAddress: string;
    recipientAddress: string;
    amount: number;
    currency: string;
    frequency: 'weekly' | 'biweekly' | 'monthly';
  }): Promise<RecurringRemittance> {
    validateRecurringRemittanceInput(data);

    const id = crypto.randomUUID();
    const createdAt = new Date();
    const nextRunAt = computeNextRunAt(createdAt, data.frequency);

    const schedule: RecurringRemittance = {
      ...data,
      id,
      createdAt,
      nextRunAt,
    };

    this.schedules.push(schedule);
    return schedule;
  }

  async list(userAddress: string): Promise<RecurringRemittance[]> {
    return this.schedules.filter(s => s.userAddress === userAddress);
  }

  async get(id: string): Promise<RecurringRemittance | null> {
    const found = this.schedules.find(s => s.id === id);
    return found ? { ...found } : null;
  }

  async update(
    id: string,
    updates: {
      recipientAddress?: string;
      amount?: number;
      currency?: string;
      frequency?: 'weekly' | 'biweekly' | 'monthly';
    }
  ): Promise<RecurringRemittance | null> {
    validateRecurringRemittanceInput(updates);

    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const updated = {
      ...this.schedules[idx],
      ...updates,
    };

    if (updates.frequency) {
      updated.nextRunAt = computeNextRunAt(new Date(), updates.frequency);
    }

    this.schedules[idx] = updated;
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx === -1) return false;

    this.schedules.splice(idx, 1);
    return true;
  }

  async clear(): Promise<void> {
    this.schedules = [];
  }
}

// Export a single canonical store instance
export const recurringStore: IRecurringRemittanceStore = new InMemoryRecurringRemittanceStore();
