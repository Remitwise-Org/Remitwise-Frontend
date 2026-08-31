/**
 * IdempotencyProvider
 *
 * Provides a deterministic idempotency boundary for authentication and recovery
 * operations. Each operation must be supplied with a durable request key (nonce).
 * Concurrent or retried requests with the same key share a single execution and
 * return the same stored result. Reuse of a key with a different request is
 * rejected with an `IdempotencyConflictError`.
 *
 * Design invariants:
 * - One committed effect per key: the provider serializes executions per key and
 *   persists the final state in the store.
 * - Deterministic success: after a completed operation, retries return the stored
 *   result without re-executing the business operation.
 * - Retriable failures: a failed operation records the error and permits a retry
 *   with the same key, re-running the business operation once.
 * - Conflict detection: the request body is hashed and bound to the key. If the
 *   hash differs, the caller receives a conflict and no state is modified.
 * - Stale state: expired records are removed and treated as absent.
 *
 * The default `InMemoryIdempotencyStore` is suitable for tests and single-process
 * deployments. For distributed deployments, supply an `IdempotencyStore` backed
 * by a durable, atomic storage system.
 */
import { createHash } from 'crypto';

export interface IdempotencyRecord<T = unknown> {
  key: string;
  requestHash: string;
  status: 'in_progress' | 'completed' | 'failed';
  result?: T;
  error?: unknown;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

export interface IdempotencyStore {
  get<T>(key: string): Promise<IdempotencyRecord<T> | undefined>;
  put<T>(record: IdempotencyRecord<T>): Promise<void>;
  delete(key: string): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private records = new Map<string, IdempotencyRecord>();

  async get<T>(key: string): Promise<IdempotencyRecord<T> | undefined> {
    return this.records.get(key) as IdempotencyRecord<T> | undefined;
  }

  async put<T>(record: IdempotencyRecord<T>): Promise<void> {
    this.records.set(record.key, record as IdempotencyRecord);
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key);
  }
}

export class IdempotencyConflictError extends Error {
  constructor(key: string) {
    super(`Idempotency key "${key}" was already used with a different request`);
    this.name = 'IdempotencyConflictError';
  }
}

export interface IdempotencyProviderOptions {
  store?: IdempotencyStore;
  ttlMs?: number;
}

interface Mutex {
  runExclusive<T>(fn: () => Promise<T>): Promise<T>;
}

function createMutex(): Mutex {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    runExclusive<T>(fn: () => Promise<T>): Promise<T> {
      const result = tail.then(() => fn());
      tail = result.catch(() => {});
      return result;
    },
  };
}

export class IdempotencyProvider {
  private readonly store: IdempotencyStore;
  private readonly ttlMs: number;
  private mutexes = new Map<string, Mutex>();

  constructor(options: IdempotencyProviderOptions = {}) {
    this.store = options.store ?? new InMemoryIdempotencyStore();
    this.ttlMs = options.ttlMs ?? 15 * 60 * 1000;
  }

  /**
   * Executes `operation` exactly once for a given idempotency `key`.
   *
   * @param key - Durable request key or nonce.
   * @param request - The request payload. Its hash is bound to the key to reject
   *                  conflicting reuse.
   * @param operation - The business operation to perform.
   * @returns The result of the operation (the same value for safe retries).
   * @throws {IdempotencyConflictError} If the key is reused with a different payload.
   */
  async execute<T>(
    key: string,
    request: unknown,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!key) {
      throw new Error('Idempotency key is required');
    }

    const requestHash = this.hash(request);

    return this.getMutex(key).runExclusive(async () => {
      const now = Date.now();
      const existing = await this.store.get<T>(key);

      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new IdempotencyConflictError(key);
        }
        if (existing.expiresAt < now) {
          await this.store.delete(key);
        } else if (existing.status === 'completed') {
          return existing.result as T;
        } else if (existing.status === 'failed') {
          // Retryable failure: reset the record and re-start the operation.
          existing.status = 'in_progress';
          existing.error = undefined;
          existing.updatedAt = now;
          await this.store.put(existing);
        }
      }

      const record: IdempotencyRecord<T> = existing ?? {
        key,
        requestHash,
        status: 'in_progress',
        createdAt: now,
        updatedAt: now,
        expiresAt: now + this.ttlMs,
      };
      if (!existing) {
        await this.store.put(record);
      }

      try {
        const result = await operation();
        const completed: IdempotencyRecord<T> = {
          ...record,
          status: 'completed',
          result,
          error: undefined,
          updatedAt: Date.now(),
          expiresAt: Date.now() + this.ttlMs,
        };
        await this.store.put(completed);
        return result;
      } catch (error) {
        const failed: IdempotencyRecord<T> = {
          ...record,
          status: 'failed',
          error,
          updatedAt: Date.now(),
          expiresAt: Date.now() + this.ttlMs,
        };
        await this.store.put(failed);
        throw error;
      }
    });
  }

  /**
   * Removes an idempotency record (e.g. post-logout or post-recovery).
   */
  async clear(key: string): Promise<void> {
    await this.getMutex(key).runExclusive(async () => {
      await this.store.delete(key);
    });
  }

  private getMutex(key: string): Mutex {
    let mutex = this.mutexes.get(key);
    if (!mutex) {
      mutex = createMutex();
      this.mutexes.set(key, mutex);
    }
    return mutex;
  }

  private hash(value: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(value ?? null))
      .digest('hex');
  }
}
