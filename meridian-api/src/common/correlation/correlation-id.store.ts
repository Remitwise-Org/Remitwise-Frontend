import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Process-wide store so services can read the active request correlation
 * ID without becoming request-scoped (which would break background work
 * such as EventsService polling).
 */
@Injectable()
export class CorrelationIdStore {
  private readonly als = new AsyncLocalStorage<{ id: string }>();

  run<T>(id: string, fn: () => T): T {
    return this.als.run({ id }, fn);
  }

  get(): string | undefined {
    return this.als.getStore()?.id;
  }
}
