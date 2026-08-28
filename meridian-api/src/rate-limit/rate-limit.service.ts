import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT, RateLimitTier } from './rate-limit.constants';
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

  get windowMs(): number {
    return Number(this.config.get('RATE_LIMIT_WINDOW_MS') ?? 60_000);
  }

  get readLimit(): number {
    return Number(this.config.get('RATE_LIMIT_READ_LIMIT') ?? 100);
  }

  get writeLimit(): number {
    return Number(this.config.get('RATE_LIMIT_WRITE_LIMIT') ?? 20);
  }

  get authMultiplier(): number {
    return Number(this.config.get('RATE_LIMIT_AUTH_MULTIPLIER') ?? 3);
  }

  get abuseThreshold(): number {
    return Number(this.config.get('RATE_LIMIT_ABUSE_THRESHOLD') ?? 5);
  }

  get abuseWindowMs(): number {
    return Number(this.config.get('RATE_LIMIT_ABUSE_WINDOW_MS') ?? 60_000);
  }

  get abuseFactor(): number {
    return Number(this.config.get('RATE_LIMIT_ABUSE_FACTOR') ?? 0.5);
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
    const windowMs = params.windowMs ?? this.windowMs;
    let limit = params.limit ?? this.baseLimit(params.tier);

    if (subject === 'user' && params.limit === undefined) {
      limit = Math.max(1, Math.floor(limit * this.authMultiplier));
    }

    const denials = await this.store.getNumber(`rl:abuse:${id}`);
    const adaptive = denials >= this.abuseThreshold;
    if (adaptive) {
      limit = Math.max(1, Math.floor(limit * this.abuseFactor));
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
