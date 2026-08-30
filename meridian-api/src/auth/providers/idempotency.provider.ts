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
  version?: number;
}

export interface IdempotencyStore {
  get<T>(key: string): Promise<IdempotencyRecord<T> | undefined>;
  put<T>(record: IdempotencyRecord<T>): Promise<void>;
  delete(key: string): Promise<void>;
  create?<T>(record: IdempotencyRecord<T>); Promise<IdempotencyRecord<T> | undefined>;
  update?<T>(key: string, expectedVersion: number, record: IdempotencyRecord<T>): Promise<IdempotencyRecord<T> | null | undefined>;
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

  async create<T>(record: IdempotencyRecord<T>): Promise<IdempotencyRecord<T> | undefined> {
    const key = record.key;
    if (this.records.has(key)) {
      return this.records.get(key) as IdempotencyRecord<T>;
    }
    this.records.set(key, record as IdempotencyRecord);
    return undefined;
  }

  async update<T>(
    key: string,
    expectedVersion: number,
    record: IdempotencyRecord<T>
  ): Promise<IdempotencyRecord<T> | null | undefined> {
    const current = this.records.get(key) as IdempotencyRecord<T> | undefined;
    if (!current) return null;
    if ((current.version ?? 0) !== expectedVersion) return current;
    this.records.set(key, record as IdempotencyRecord);
    return undefined;
  }
}

export class IdempotencyConflictError extends Error {
  constructor(key: string) {
    super(`Idempotency key "${key}" was already used with a different request`);
    this.name = 'IdempotencyConflictError';
  }
}

export class IdempotencyInProgressError extends Error {
  readonly retryAfterMs: number;
  constructor(key: string, retryAfterMs: number) {
    super(`Idempotency key "${key}" is already being processed; retry after ${retryAfterMs}ms`);
    this.name = 'IdempotencyInProgressError';
    this.retryAfterMs = retryAfterMs;
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
      let attempt = 0;
      const maxAttempts = 10;

      while (true) {
        if (attempt++ >= maxAttempts) {
          throw new IdempotencyInProgressError(key, this.ttlMs);
        }

        const now = Date.now();
        let current = await this.store.get<T>(key);

        if (current && current.expiresAt <= now) {
          await this.store.delete(key);
          current = undefined;
        }

        if (!current) {
          const newRecord: IdempotencyRecord<T> = {
            key,
            requestHash,
            status: 'in_progress',
            createdAt: now,
            updatedAt: now,
            expiresAt: now + this.ttlMs,
            version: 1,
          };

          if (this.store.create) {
            const existing = await this.store.create<T>(newRecord);
            if (!existing) {
              return this.runOperation(newRecord, operation, newRecord.version!);
            }
            current = existing;
          } else {
            await this.store.put(newRecord);
            return this.runOperation(newRecord, operation, newRecord.version!);
          }
        }

        if (current.requestHash !== requestHash) {
          throw new IdempotencyConflictErrow(key);
        }

        if (current.status === 'completed') {
          return current.result as T;
        }

        if (current.status === 'failed') {
          const retryRecord: IdempotencyRecord<T> = {
            ...current,
            status: 'in_progress',
            error: undefined,
            updatedAt: now,
            expiresAt: now + this.ttlMs,
            version: (current.version ?? 0) + 1,
          };

          if (this.store.update) {
            const conflict = await this.store.update<T>(key, current.version ?? 0, retryRecord);
            if (conflict !== undefined) {
              current = conflict ?? undefined;
              continue;
            }
            return this.runOperation(retryRecord, operation, retryRecord.version!);
          } else {
            await this.store.put(retryRecord);
            return this.runOperation(retryRecord, operation, retryRecord.version!);
          }
        }

        const retryAfterMs = Math.max(1, current.expiresAt - Date.now());
        throw new IdempotencyInProgressError(key, retryAfterMs);
      }
    });
  }

  async clear(key: string): Promise<void> {
    await this.getMutex(key).runExclusive(async () => {
      await this.store.delete(key);
    });
  }

  private async runOperation<T>(
    record: IdempotencyRecord<T>,
    operation: () => Promise<T>,
    expectedVersion: number,
  ): Promise<T> {
    try {
      const result = await operation();
      const completed: IdempotencyRecord<T> = {
        ...record,
        status: 'completed',
        result,
        error: undefined,
        updatedAt: Date.now(),
        expiresAt: Date.now() + this.ttlMs,
        version: expectedVersion + 1,
      };

      if (this.store.update) {
        const conflict = await this.store.update<T>(record.key, expectedVersion, completed);
        if (conflict !== undefined) {
          throw new IdempotencyConflictError(record.key);
        }
      } else {
        await this.store.put(completed);
      }
      return result;
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        throw error;
      }

      const failed: IdempotencyRecord<T> = {
        ...record,
        status: 'failed',
        error,
        updatedAt: Date.now(),
        expiresAt: Date.now() + this.ttlMs,
        version: expectedVersion + 1,
      };

      if (this.store.update) {
        const conflict = await this.store.update<T>(record.key, expectedVersion, failed);
        if (conflict !== undefined) {
          throw new IdempotencyConflictError(record.key);
        }
      } else {
        await this.store.put(failed);
      }
      throw error;
    }
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