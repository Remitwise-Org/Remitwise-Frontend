import { RecurringRemittance } from '@/utils/types/recurringRemittance.types';
import { StrKey } from '@stellar/stellar-sdk';
import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';
import { computeNextRunAt } from '@/lib/remittance/recurring-frequency';

export interface PendingRecurringRun {
  id: string;
  scheduleId: string;
  dueAt: Date;
  recipientAddress: string;
  amount: number;
  currency: string;
  status: 'pending';
  createdAt: Date;
}

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

  findDue(now: Date, limit: number): Promise<RecurringRemittance[]>;

  createPendingRunAndAdvance(
    schedule: RecurringRemittance,
    dueAt: Date,
    nextRunAt: Date,
  ): Promise<boolean>;

  listPendingRuns(
    userAddress: string,
    scheduleId: string,
  ): Promise<PendingRecurringRun[]>;

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

/**
 * In-memory implementation of the recurring remittance store.
 * Marked clearly as in-memory to differentiate from future persistent databases.
 */
export class InMemoryRecurringRemittanceStore implements IRecurringRemittanceStore {
  private schedules: RecurringRemittance[] = [];
  private runs: PendingRecurringRun[] = [];

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
    const nextRunAt = computeNextRunAt(data.frequency, createdAt);

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
      updated.nextRunAt = computeNextRunAt(updates.frequency, new Date());
    }

    this.schedules[idx] = updated;
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx === -1) return false;

    this.schedules.splice(idx, 1);
    this.runs = this.runs.filter((run) => run.scheduleId !== id);
    return true;
  }

  async findDue(now: Date, limit: number): Promise<RecurringRemittance[]> {
    return this.schedules
      .filter((schedule) => schedule.nextRunAt <= now)
      .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())
      .slice(0, limit)
      .map((schedule) => ({ ...schedule }));
  }

  async createPendingRunAndAdvance(
    schedule: RecurringRemittance,
    dueAt: Date,
    nextRunAt: Date,
  ): Promise<boolean> {
    const current = this.schedules.find((item) => item.id === schedule.id);
    if (!current || current.nextRunAt.getTime() !== dueAt.getTime()) return false;
    if (
      this.runs.some(
        (run) =>
          run.scheduleId === schedule.id &&
          run.dueAt.getTime() === dueAt.getTime(),
      )
    ) {
      return false;
    }

    this.runs.push({
      id: crypto.randomUUID(),
      scheduleId: schedule.id,
      dueAt: new Date(dueAt),
      recipientAddress: current.recipientAddress,
      amount: current.amount,
      currency: current.currency,
      status: 'pending',
      createdAt: new Date(),
    });
    current.lastRunAt = new Date(dueAt);
    current.nextRunAt = new Date(nextRunAt);
    return true;
  }

  async listPendingRuns(
    userAddress: string,
    scheduleId: string,
  ): Promise<PendingRecurringRun[]> {
    const schedule = this.schedules.find(
      (item) => item.id === scheduleId && item.userAddress === userAddress,
    );
    if (!schedule) return [];
    return this.runs
      .filter((run) => run.scheduleId === scheduleId && run.status === 'pending')
      .map((run) => ({ ...run, dueAt: new Date(run.dueAt), createdAt: new Date(run.createdAt) }));
  }

  async clear(): Promise<void> {
    this.schedules = [];
    this.runs = [];
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

    const nextRunAt = computeNextRunAt(data.frequency, new Date());

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
      updateData.nextRunAt = computeNextRunAt(updates.frequency, new Date());
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

  async findDue(now: Date, limit: number): Promise<RecurringRemittance[]> {
    const records = await this.prisma.recurringRemittance.findMany({
      where: { nextRunAt: { lte: now } },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
    });

    return records.map((record) => this.mapToType(record));
  }

  async createPendingRunAndAdvance(
    schedule: RecurringRemittance,
    dueAt: Date,
    nextRunAt: Date,
  ): Promise<boolean> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.recurringRemittance.updateMany({
          where: {
            id: schedule.id,
            nextRunAt: dueAt,
            recipientAddress: schedule.recipientAddress,
            amount: schedule.amount,
            currency: schedule.currency,
            frequency: schedule.frequency,
          },
          data: {
            lastRunAt: dueAt,
            nextRunAt,
          },
        });

        if (updated.count !== 1) return false;

        await transaction.recurringRun.create({
          data: {
            scheduleId: schedule.id,
            dueAt,
            recipientAddress: schedule.recipientAddress,
            amount: schedule.amount,
            currency: schedule.currency,
          },
        });

        return true;
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }

  async listPendingRuns(
    userAddress: string,
    scheduleId: string,
  ): Promise<PendingRecurringRun[]> {
    const records = await this.prisma.recurringRun.findMany({
      where: {
        scheduleId,
        status: 'pending',
        schedule: { is: { userAddress } },
      },
      orderBy: { dueAt: 'asc' },
    });

    return records.map((record) => ({
      id: record.id,
      scheduleId: record.scheduleId,
      dueAt: record.dueAt,
      recipientAddress: record.recipientAddress,
      amount: record.amount,
      currency: record.currency,
      status: 'pending',
      createdAt: record.createdAt,
    }));
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

// Export a single canonical store instance
export const recurringStore: IRecurringRemittanceStore =
  new PrismaRecurringRemittanceStore(prisma);
