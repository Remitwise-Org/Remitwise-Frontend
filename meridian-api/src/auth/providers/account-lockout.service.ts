import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Account lockout service (issue #1651).
 *
 * Tracks per-email failed sign-in attempts using a bounded in-memory store.
 * After `maxAttempts` failures within the `windowMs` window the account is
 * locked for `lockoutMs` — rejecting every subsequent attempt with a
 * `Retry-After` header value.
 *
 * # Invariants
 *
 * 1. A successful sign-in immediately resets the attempt counter.
 * 2. Lockout is time-bounded: after `lockoutMs` the counter is reset.
 * 3. The store is bounded — stale entries are evicted to prevent OOM.
 * 4. The store is process-local. For horizontal scaling use Redis.
 */

export interface LockoutState {
  /** Number of consecutive failures. */
  attempts: number;
  /** Epoch ms when the lockout expires, or `null` if not locked. */
  lockedUntil: number | null;
  /** Epoch ms of the first failure in the current window. */
  windowStart: number;
}

interface StoredEntry extends LockoutState {
  /** Epoch ms of the last update — used for eviction. */
  lastTouchedAt: number;
}

@Injectable()
export class AccountLockoutService {
  private readonly logger = new Logger(AccountLockoutService.name);

  /** Per-email lockout state. */
  private readonly store = new Map<string, StoredEntry>();

  /** Hard cap on store size; oldest-by-lastTouchedAt entries are evicted. */
  private static readonly MAX_ENTRIES = 10_000;

  constructor(private readonly config: ConfigService) {}

  /** Max consecutive failures before lockout. Default: 5. */
  get maxAttempts(): number {
    return Number(this.config.get('AUTH_LOCKOUT_MAX_ATTEMPTS') ?? 5);
  }

  /** Window (ms) in which failures are counted. Default: 15 minutes. */
  get windowMs(): number {
    return Number(this.config.get('AUTH_LOCKOUT_WINDOW_MS') ?? 15 * 60 * 1000);
  }

  /** How long the account is locked (ms). Default: 15 minutes. */
  get lockoutMs(): number {
    return Number(this.config.get('AUTH_LOCKOUT_DURATION_MS') ?? 15 * 60 * 1000);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Returns the current lockout state for `email`, or `null` if no
   * failures have been recorded within the window.
   */
  getState(email: string): LockoutState | null {
    const key = this.normalize(email);
    const entry = this.store.get(key);
    if (!entry) return null;
    return { attempts: entry.attempts, lockedUntil: entry.lockedUntil, windowStart: entry.windowStart };
  }

  /**
   * Check whether the account is currently locked.
   *
   * If the lockout has expired the state is reset automatically.
   *
   * @returns `null` if not locked, otherwise the remaining lockout in ms.
   */
  isLocked(email: string): number | null {
    const key = this.normalize(email);
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();

    // Expired window → reset.
    if (now - entry.windowStart > this.windowMs && !entry.lockedUntil) {
      this.store.delete(key);
      return null;
    }

    if (entry.lockedUntil) {
      if (now < entry.lockedUntil) {
        return entry.lockedUntil - now;
      }
      // Lockout expired — reset.
      this.store.delete(key);
      return null;
    }

    return null;
  }

  /**
   * Record a failed sign-in attempt.  Returns the remaining lockout in ms
   * if the account is now locked, otherwise `null`.
   */
  recordFailure(email: string): number | null {
    const key = this.normalize(email);
    const now = Date.now();
    this.evictIfNeeded(now);

    let entry = this.store.get(key);

    // New entry or expired window.
    if (!entry || (now - entry.windowStart > this.windowMs && !entry.lockedUntil)) {
      entry = { attempts: 1, lockedUntil: null, windowStart: now, lastTouchedAt: now };
      this.store.set(key, entry);
      return null;
    }

    entry.attempts += 1;
    entry.lastTouchedAt = now;

    if (entry.attempts >= this.maxAttempts && !entry.lockedUntil) {
      entry.lockedUntil = now + this.lockoutMs;
      this.logger.warn(
        `Account locked: ${email} (${entry.attempts} failures in ${this.windowMs}ms) — locked for ${this.lockoutMs}ms`,
      );
      return this.lockoutMs;
    }

    return null;
  }

  /**
   * Reset the counter on successful sign-in.
   */
  recordSuccess(email: string): void {
    const key = this.normalize(email);
    this.store.delete(key);
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Evict the oldest-by-lastTouchedAt entries when the store exceeds the
   * hard cap, keeping at most 80 % of the cap.
   */
  private evictIfNeeded(now: number): void {
    if (this.store.size <= AccountLockoutService.MAX_ENTRIES) return;

    const target = Math.floor(AccountLockoutService.MAX_ENTRIES * 0.8);
    const entries = [...this.store.entries()]
      .sort((a, b) => a[1].lastTouchedAt - b[1].lastTouchedAt);

    for (let i = 0; i < entries.length - target; i++) {
      this.store.delete(entries[i][0]);
    }
  }
}
