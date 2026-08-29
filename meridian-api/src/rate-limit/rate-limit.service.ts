import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RATE_LIMIT_MAX_ABUSE_THRESHOLD,
  RATE_LIMIT_MAX_LIMIT,
  RATE_LIMIT_MAX_WINDOW_MS,
  RATE_LIMIT_MIN_WINDOW_MS,
  REDIS_CLIENT,
  RateLimitTier,
} from './rate-limit.constants';
import {
  MemoryRateLimitStore,
  RedisRateLimitStore,
  RateLimitStore,
  SlidingWindowHit,
} from './rate-limit.store';
import type Redis from 'ioredis';

export interface RateLimitDecision extends SlidingWindowHit {
  tier: RateLimitTier;
  key: string;
  subject: 'user' | 'ip';
  adaptive: boolean;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly store: RateLimitStore;

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject(REDIS_CLIENT) redis?: Redis | null,
  ) {
    if (redis) {
      this.store = new RedisRateLimitStore(redis);
      this.logger.log('Rate limiting backed by Redis sliding windows');
    } else {
      this.store = new MemoryRateLimitStore();
      this.logger.warn(
        'REDIS_URL is not set; rate limits use in-process memory and will not share across instances',
      );
    }
  }

  private clampInteger(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const parsed = Number(value ?? fallback);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(Math.max(Math.trunc(parsed), min), max);
  }

  private clampFloat(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const parsed = Number(value ?? fallback);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(Math.max(parsed, min), max);
  }

  get windowMs(): number {
    return this.clampInteger(
      this.config.get('RATE_LIMIT_WINDOW_MS'),
      60_000,
      RATE_LIMIT_MIN_WINDOW_MS,
      RATE_LIMIT_MAX_WINDOW_MS,
    );
  }

  get readLimit(): number {
    return this.clampInteger(
      this.config.get('RATE_LIMIT_READ_LIMIT'),
      100,
      1,
      RATE_LIMIT_MAX_LIMIT,
    );
  }

  get writeLimit(): number {
    return this.clampInteger(
      this.config.get('RATE_LIMIT_WRITE_LIMIT'),
      20,
      1,
      RATE_LIMIT_MAX_LIMIT,
    );
  }

  get authMultiplier(): number {
    return this.clampFloat(
      this.config.get('RATE_LIMIT_AUTH_MULTIPLIER'),
      3,
      1,
      100,
    );
  }

  get abuseThreshold(): number {
    return this.clampInteger(
      this.config.get('RATE_LIMIT_ABUSE_THRESHOLD'),
      5,
      1,
      RATE_LIMIT_MAX_ABUSE_THRESHOLD,
    );
  }

  get abuseWindowMs(): number {
    return this.clampInteger(
      this.config.get('RATE_LIMIT_ABUSE_WINDOW_MS'),
      60_000,
      RATE_LIMIT_MIN_WINDOW_MS,
      RATE_LIMIT_MAX_WINDOW_MS,
    );
  }

  get abuseFactor(): number {
    return this.clampFloat(
      this.config.get('RATE_LIMIT_ABUSE_FACTOR'),
      0.5,
      0.1,
      1,
    );
  }

  baseLimit(tier: RateLimitTier): number {
    return tier === 'write' ? this.writeLimit : this.readLimit;
  }

  /**
   * Authenticated callers share a per-user key with a higher quota.
   * Everyone else is keyed by client IP.
   */
  resolveSubject(
    userId?: string | number | null,
    ip?: string | null,
  ): { subject: 'user' | 'ip'; id: string } {
    if (userId !== undefined && userId !== null && `${userId}`.length > 0) {
      return { subject: 'user', id: `user:${userId}` };
    }
    const fallback = ip && ip.trim() ? ip.trim() : 'unknown';
    return { subject: 'ip', id: `ip:${fallback}` };
  }

  async consume(params: {
    tier: RateLimitTier;
    userId?: string | number | null;
    ip?: string | null;
    /** Absolute override (e.g. @Throttle on a login route). */
    limit?: number;
    windowMs?: number;
  }): Promise<RateLimitDecision> {
    const { subject, id } = this.resolveSubject(params.userId, params.ip);
    const windowMs = this.clampInteger(
      params.windowMs,
      this.windowMs,
      RATE_LIMIT_MIN_WINDOW_MS,
      RATE_LIMIT_MAX_WINDOW_MS,
    );
    const baseLimit = this.baseLimit(params.tier);
    const requestedLimit =
      params.limit == null
        ? baseLimit
        : this.clampInteger(params.limit, baseLimit, 1, RATE_LIMIT_MAX_LIMIT);
    let limit = requestedLimit;

    if (subject === 'user' && params.limit == null) {
      limit = this.clampInteger(
        Math.floor(limit * this.authMultiplier),
        limit,
        1,
        RATE_LIMIT_MAX_LIMIT,
      );
    }

    const denials = await this.store.getNumber(`rl:abuse:${id}`);
    const adaptive = denials >= this.abuseThreshold;
    if (adaptive) {
      limit = this.clampInteger(
        Math.floor(limit * this.abuseFactor),
        1,
        1,
        RATE_LIMIT_MAX_LIMIT,
      );
    }

    const nowMs = Date.now();
    const member = `${nowMs}-${Math.random().toString(36).slice(2, 10)}`;
    const bucket = `rl:${params.tier}:${id}`;
    const hit = await this.store.hit(bucket, nowMs, windowMs, limit, member);

    if (!hit.allowed) {
      await this.store.incrWithTtl(`rl:abuse:${id}`, this.abuseWindowMs);
    }

    return {
      ...hit,
      limit,
      remaining: hit.allowed ? Math.max(0, limit - hit.count) : 0,
      tier: params.tier,
      key: bucket,
      subject,
      adaptive,
    };
  }
}
