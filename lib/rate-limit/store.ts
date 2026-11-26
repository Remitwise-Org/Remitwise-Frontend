import { LRUCache } from 'lru-cache';
import { evaluateSlidingWindow } from './sliding-window';

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitStore {
  consume(
    key: string,
    now: number,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitDecision>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly events = new LRUCache<string, number[]>({ max: 10_000 });

  async consume(
    key: string,
    now: number,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitDecision> {
    const result = evaluateSlidingWindow(
      this.events.get(key) ?? [],
      now,
      limit,
      windowMs,
    );
    this.events.set(key, result.timestamps, { ttl: windowMs });
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt,
    };
  }
}

export class HttpRateLimitStore implements RateLimitStore {
  constructor(private readonly endpoint: string) {}

  async consume(
    key: string,
    now: number,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitDecision> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, now, limit, windowMs }),
      signal: AbortSignal.timeout(1_000),
    });

    if (!response.ok) {
      throw new Error(`Rate-limit store returned HTTP ${response.status}.`);
    }

    const result: unknown = await response.json();
    if (!result || typeof result !== 'object') {
      throw new Error('Rate-limit store returned an invalid decision.');
    }

    const payload = result as Record<string, unknown>;
    if (
      typeof payload.allowed !== 'boolean' ||
      typeof payload.remaining !== 'number' ||
      !Number.isInteger(payload.remaining) ||
      typeof payload.resetAt !== 'number' ||
      !Number.isFinite(payload.resetAt)
    ) {
      throw new Error('Rate-limit store returned an invalid decision.');
    }

    return {
      allowed: payload.allowed,
      remaining: Math.max(0, Math.min(limit, payload.remaining)),
      resetAt: payload.resetAt,
    };
  }
}
