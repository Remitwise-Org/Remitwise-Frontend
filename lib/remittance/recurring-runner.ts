import { registerShutdownHook, runBackgroundJob } from '@/lib/background/runtime';
import {
  recurringStore,
  type IRecurringRemittanceStore,
} from '@/lib/remittance/recurring-store';
import { computeNextRunAt } from '@/lib/remittance/recurring-frequency';
import type { RecurringRemittance } from '@/utils/types/recurringRemittance.types';

export { computeNextRunAt };

const DEFAULT_INTERVAL_MS = 30_000;
const DEFAULT_BATCH_SIZE = 100;
const SHUTDOWN_HOOK_NAME = 'recurring_remittance_runner';

export interface RecurringRunnerResult {
  checked: number;
  created: number;
  skipped: number;
  failed: number;
}

export async function processDueRecurringRemittances(options: {
  now?: Date;
  limit?: number;
  store?: IRecurringRemittanceStore;
} = {}): Promise<RecurringRunnerResult> {
  const now = options.now ?? new Date();
  const limit = options.limit ?? DEFAULT_BATCH_SIZE;
  const store = options.store ?? recurringStore;
  const dueSchedules = await store.findDue(now, limit);

  const results = await Promise.allSettled(
    dueSchedules.map((schedule: RecurringRemittance) =>
      Promise.resolve().then(() => {
        const dueAt = new Date(schedule.nextRunAt);
        const nextRunAt = computeNextRunAt(schedule.frequency, dueAt);
        return store.createPendingRunAndAdvance(schedule, dueAt, nextRunAt);
      }),
    ),
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === 'rejected') {
      failed += 1;
      console.error('[RecurringRunner] Failed to process a due schedule', result.reason);
    } else if (result.value) {
      created += 1;
    } else {
      skipped += 1;
    }
  }

  return { checked: dueSchedules.length, created, skipped, failed };
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startRecurringRemittanceLoop(
  intervalMs = DEFAULT_INTERVAL_MS,
  run: () => Promise<RecurringRunnerResult> = processDueRecurringRemittances,
): void {
  if (interval) return;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error('Recurring remittance interval must be a positive number');
  }

  const tick = () => {
    void runBackgroundJob('recurring_remittance_runner', run)
      .then((result) => {
        if (result.created > 0 || result.failed > 0) {
          console.info(`[RecurringRunner] Loop result: ${JSON.stringify(result)}`);
        }
      })
      .catch((error) => {
        console.error('[RecurringRunner] Background run failed', error);
      });
  };

  registerShutdownHook(SHUTDOWN_HOOK_NAME, () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  });

  tick();
  interval = setInterval(tick, intervalMs);
  interval.unref?.();
}
