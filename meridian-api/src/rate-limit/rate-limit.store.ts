export interface SlidingWindowHit {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  /** Unix epoch seconds when the current window resets. */
  resetAt: number;
}

export interface RateLimitStore {
  hit(
    key: string,
    nowMs: number,
    windowMs: number,
    limit: number,
    member: string,
  ): Promise<SlidingWindowHit>;
  incrWithTtl(key: string, ttlMs: number): Promise<number>;
  getNumber(key: string): Promise<number>;
}

/**
 * Process-local sliding window used when REDIS_URL is unset (tests / local
 * boot). Per-key queues keep hits atomic under Promise.all.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, { score: number; member: string }[]>();
  private readonly counters = new Map<string, { value: number; expiresAt: number }>();
  private readonly locks = new Map<string, Promise<void>>();

  private async withLock<T>(key: string, fn: () => T | Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(
      key,
      previous.then(() => current),
    );
    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(key) === current) {
        this.locks.delete(key);
      }
    }
  }

  async hit(
    key: string,
    nowMs: number,
    windowMs: number,
    limit: number,
    member: string,
  ): Promise<SlidingWindowHit> {
    return this.withLock(key, () => {
      const cutoff = nowMs - windowMs;
      const entries = (this.windows.get(key) ?? []).filter((e) => e.score > cutoff);
      const resetFromOldest = entries.length
        ? Math.ceil((entries[0].score + windowMs) / 1000)
        : Math.ceil((nowMs + windowMs) / 1000);

      if (entries.length >= limit) {
        this.windows.set(key, entries);
        return {
          allowed: false,
          count: entries.length,
          limit,
          remaining: 0,
          resetAt: resetFromOldest,
        };
      }

      entries.push({ score: nowMs, member });
      this.windows.set(key, entries);
      return {
        allowed: true,
        count: entries.length,
        limit,
        remaining: Math.max(0, limit - entries.length),
        resetAt: Math.ceil((nowMs + windowMs) / 1000),
      };
    });
  }

  async incrWithTtl(key: string, ttlMs: number): Promise<number> {
    return this.withLock(`incr:${key}`, () => {
      const now = Date.now();
      const current = this.counters.get(key);
      if (!current || current.expiresAt <= now) {
        this.counters.set(key, { value: 1, expiresAt: now + ttlMs });
        return 1;
      }
      current.value += 1;
      return current.value;
    });
  }

  async getNumber(key: string): Promise<number> {
    const current = this.counters.get(key);
    if (!current || current.expiresAt <= Date.now()) {
      return 0;
    }
    return current.value;
  }
}

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetMs = now + window
  if oldest[2] then
    resetMs = tonumber(oldest[2]) + window
  end
  return {0, count, limit, resetMs}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, count + 1, limit, now + window}
`;

type RedisEvalClient = {
  eval: (
    script: string,
    numKeys: number,
    key: string,
    now: number,
    window: number,
    limit: number,
    member: string,
  ) => Promise<unknown>;
  incr: (key: string) => Promise<number>;
  pexpire: (key: string, ms: number) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
};

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: RedisEvalClient) {}

  async hit(
    key: string,
    nowMs: number,
    windowMs: number,
    limit: number,
    member: string,
  ): Promise<SlidingWindowHit> {
    const raw = (await this.redis.eval(
      SLIDING_WINDOW_LUA,
      1,
      key,
      nowMs,
      windowMs,
      limit,
      member,
    )) as (number | string)[];
    const allowed = Number(raw[0]) === 1;
    const count = Number(raw[1]);
    const resolvedLimit = Number(raw[2]);
    const resetMs = Number(raw[3]);
    return {
      allowed,
      count,
      limit: resolvedLimit,
      remaining: allowed ? Math.max(0, resolvedLimit - count) : 0,
      resetAt: Math.ceil(resetMs / 1000),
    };
  }

  async incrWithTtl(key: string, ttlMs: number): Promise<number> {
    const value = await this.redis.incr(key);
    if (value === 1) {
      await this.redis.pexpire(key, ttlMs);
    }
    return value;
  }

  async getNumber(key: string): Promise<number> {
    const raw = await this.redis.get(key);
    const value = raw == null ? 0 : Number(raw);
    return Number.isFinite(value) ? value : 0;
  }
}
