import { afterEach, describe, expect, it, vi } from 'vitest';

const runtimeMocks = vi.hoisted(() => ({
  runBackgroundJob: vi.fn(
    (_name: string, job: () => Promise<unknown>) => job(),
  ),
  registerShutdownHook: vi.fn(
    (_name: string, _hook: () => void | Promise<void>) => {},
  ),
}));

vi.mock('@/lib/background/runtime', () => runtimeMocks);

import {
  computeNextRunAt,
  processDueRecurringRemittances,
  startRecurringRemittanceLoop,
} from '@/lib/remittance/recurring-runner';
import { InMemoryRecurringRemittanceStore } from '@/lib/remittance/recurring-store';
import type { RecurringFrequency } from '@/lib/remittance/recurring-frequency';

const userAddress = 'GBPABUP5J7BKR3QYCPGX6JV5L6TBLIZZIODF5RA634K6U4NBLLHC5WNU';
const recipientAddress = 'GDNZCYDH24SG4RWKTCGIH75KCGSYFXOQVPMSC7S6I2E66C2PHFNKE3LM';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('computeNextRunAt', () => {
  it.each([
    ['weekly', '2026-01-15T10:30:45.000Z', '2026-01-22T10:30:45.000Z'],
    ['biweekly', '2026-01-15T10:30:45.000Z', '2026-01-29T10:30:45.000Z'],
    ['monthly', '2026-01-15T10:30:45.000Z', '2026-02-15T10:30:45.000Z'],
    ['monthly', '2026-01-31T10:30:45.000Z', '2026-02-28T10:30:45.000Z'],
    ['monthly', '2024-01-31T10:30:45.000Z', '2024-02-29T10:30:45.000Z'],
  ] as const)(
    'computes %s from %s as %s',
    (frequency, from, expected) => {
      expect(
        computeNextRunAt(
          frequency as RecurringFrequency,
          new Date(from),
        ).toISOString(),
      ).toBe(expected);
    },
  );
});

describe('processDueRecurringRemittances', () => {
  it('creates one pending unsigned run and advances a due schedule', async () => {
    const now = new Date('2026-01-31T10:00:00.000Z');
    const store = new InMemoryRecurringRemittanceStore();
    const schedule = await store.create({
      userAddress,
      recipientAddress,
      amount: 125,
      currency: 'USDC',
      frequency: 'monthly',
    });
    schedule.nextRunAt = now;

    const result = await processDueRecurringRemittances({ now, store });
    const runs = await store.listPendingRuns(userAddress, schedule.id);
    const updated = await store.get(schedule.id);

    expect(result).toMatchObject({ checked: 1, created: 1, skipped: 0, failed: 0 });
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      scheduleId: schedule.id,
      dueAt: now,
      status: 'pending',
      recipientAddress,
      amount: 125,
      currency: 'USDC',
    });
    expect(updated?.lastRunAt).toEqual(now);
    expect(updated?.nextRunAt.toISOString()).toBe('2026-02-28T10:00:00.000Z');
  });

  it('does not process a schedule before its nextRunAt', async () => {
    const now = new Date('2026-01-15T10:00:00.000Z');
    const store = new InMemoryRecurringRemittanceStore();
    const schedule = await store.create({
      userAddress,
      recipientAddress,
      amount: 50,
      currency: 'XLM',
      frequency: 'weekly',
    });
    schedule.nextRunAt = new Date('2026-01-16T10:00:00.000Z');

    const result = await processDueRecurringRemittances({ now, store });

    expect(result).toMatchObject({ checked: 0, created: 0, failed: 0 });
    expect(await store.listPendingRuns(userAddress, schedule.id)).toHaveLength(0);
  });

  it('deduplicates concurrent runs for the same schedule and due date', async () => {
    const now = new Date('2026-01-15T10:00:00.000Z');
    const store = new InMemoryRecurringRemittanceStore();
    const schedule = await store.create({
      userAddress,
      recipientAddress,
      amount: 75,
      currency: 'USDC',
      frequency: 'weekly',
    });
    schedule.nextRunAt = now;

    const results = await Promise.all([
      processDueRecurringRemittances({ now, store }),
      processDueRecurringRemittances({ now, store }),
    ]);

    expect(results.reduce((sum, result) => sum + result.created, 0)).toBe(1);
    expect(await store.listPendingRuns(userAddress, schedule.id)).toHaveLength(1);
    expect((await store.get(schedule.id))?.nextRunAt.toISOString()).toBe(
      '2026-01-22T10:00:00.000Z',
    );
  });

  it('continues processing other schedules when one schedule fails', async () => {
    const now = new Date('2026-01-15T10:00:00.000Z');
    const store = new InMemoryRecurringRemittanceStore();
    const failedSchedule = await store.create({
      userAddress,
      recipientAddress,
      amount: 25,
      currency: 'USDC',
      frequency: 'weekly',
    });
    const successfulSchedule = await store.create({
      userAddress,
      recipientAddress,
      amount: 30,
      currency: 'USDC',
      frequency: 'weekly',
    });
    failedSchedule.nextRunAt = now;
    successfulSchedule.nextRunAt = now;

    const createRun = store.createPendingRunAndAdvance.bind(store);
    vi.spyOn(store, 'createPendingRunAndAdvance').mockImplementation(
      async (schedule, dueAt, nextRunAt) => {
        if (schedule.id === failedSchedule.id) {
          throw new Error('injected schedule failure');
        }
        return createRun(schedule, dueAt, nextRunAt);
      },
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await processDueRecurringRemittances({ now, store });

    expect(result).toMatchObject({ checked: 2, created: 1, failed: 1 });
    expect(
      await store.listPendingRuns(userAddress, successfulSchedule.id),
    ).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});

describe('startRecurringRemittanceLoop', () => {
  it('stops scheduling work when the graceful shutdown hook runs', async () => {
    vi.useFakeTimers();
    let shutdownHook: (() => void | Promise<void>) | undefined;
    runtimeMocks.registerShutdownHook.mockImplementation((_name, hook) => {
      shutdownHook = hook;
    });
    const run = vi.fn().mockResolvedValue({
      checked: 0,
      created: 0,
      skipped: 0,
      failed: 0,
    });

    startRecurringRemittanceLoop(1000, run);
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    await shutdownHook?.();
    await vi.advanceTimersByTimeAsync(3000);

    expect(run).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.registerShutdownHook).toHaveBeenCalledWith(
      'recurring_remittance_runner',
      expect.any(Function),
    );
  });
});
