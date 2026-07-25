import { RecurringRemittance } from '@/utils/types/recurringRemittance.types';
import { StrKey } from '@stellar/stellar-sdk';
import { PrismaClient } from '@prisma/client';

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

/**
 * Prisma implementation of the recurring remittance store.
 * Uses persistent SQLite database for durability across server restarts.
 */
export class PrismaRecurringRemittanceStore implements IRecurringRemittanceStore {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: {
    userAddress: string;
    recipientAddress: string;
    amount: number;
    currency: string;
    frequency: 'weekly' | 'biweekly' | 'monthly';
  }): Promise<RecurringRemittance> {
    validateRecurringRemittanceInput(data);

    const nextRunAt = computeNextRunAt(new Date(), data.frequency);

    const record = await this.prisma.recurringRemittance.create({
      data: {
        userAddress: data.userAddress,
        recipientAddress: data.recipientAddress,
        amount: data.amount,
        currency: data.currency,
        frequency: data.frequency,
        nextRunAt,
      },
    });

    return this.mapToType(record);
  }

  async list(userAddress: string): Promise<RecurringRemittance[]> {
    const records = await this.prisma.recurringRemittance.findMany({
      where: { userAddress },
    });

    return records.map(r => this.mapToType(r));
  }

  async get(id: string): Promise<RecurringRemittance | null> {
    const record = await this.prisma.recurringRemittance.findUnique({
      where: { id },
    });

    return record ? this.mapToType(record) : null;
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

    const updateData: any = { ...updates };

    if (updates.frequency) {
      updateData.nextRunAt = computeNextRunAt(new Date(), updates.frequency);
    }

    const record = await this.prisma.recurringRemittance.update({
      where: { id },
      data: updateData,
    }).catch(() => null);

    return record ? this.mapToType(record) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.recurringRemittance.delete({
      where: { id },
    }).catch(() => null);

    return result !== null;
  }

  async clear(): Promise<void> {
    await this.prisma.recurringRemittance.deleteMany({});
  }

  private mapToType(record: any): RecurringRemittance {
    return {
      id: record.id,
      userAddress: record.userAddress,
      recipientAddress: record.recipientAddress,
      amount: record.amount,
      currency: record.currency,
      frequency: record.frequency as 'weekly' | 'biweekly' | 'monthly',
      nextRunAt: record.nextRunAt,
      lastRunAt: record.lastRunAt || undefined,
      createdAt: record.createdAt,
    };
  }
}

// Initialize Prisma client (singleton pattern)
const prismaClientSingleton = (() => {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient();
  } else {
    let prisma: PrismaClient;
    if (!global.prisma) {
      global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
    return prisma;
  }
})();

// Export a single canonical store instance
export const recurringStore: IRecurringRemittanceStore = new PrismaRecurringRemittanceStore(
  prismaClientSingleton
);
