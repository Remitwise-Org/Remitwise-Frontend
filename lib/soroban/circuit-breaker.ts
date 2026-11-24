/**
 * Circuit breaker for Soroban RPC calls.
 *
 * States:
 * - closed: requests flow through; consecutive failures are counted.
 * - open: requests are rejected immediately until the cool-down elapses.
 * - half-open: a single trial request is allowed; success closes the circuit,
 *   failure re-opens it.
 *
 * @module lib/soroban/circuit-breaker
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Consecutive failures required to open the circuit. */
  failureThreshold: number;
  /** Milliseconds to wait in the open state before allowing a trial request. */
  cooldownMs: number;
  /** Clock source, injectable for tests. */
  now?: () => number;
}

export interface CircuitBreakerSnapshot {
  state: CircuitState;
  failures: number;
  failureThreshold: number;
  cooldownMs: number;
  openedAt: number | null;
  retryAfterMs: number;
}

export const DEFAULT_BREAKER_THRESHOLD = 5;
export const DEFAULT_BREAKER_COOLDOWN_MS = 30_000;

/**
 * Error thrown when a call is rejected because the circuit is open.
 * Carries the number of seconds a client should wait before retrying.
 */
export class CircuitOpenError extends Error {
  readonly code = 'CIRCUIT_OPEN';
  readonly httpStatus = 503;
  readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number) {
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    super(`Soroban RPC is unavailable; retry after ${retryAfterSeconds}s`);
    this.name = 'CircuitOpenError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return fallback;
  }
  return parsed;
}

/**
 * Reads breaker configuration from SOROBAN_BREAKER_THRESHOLD and
 * SOROBAN_BREAKER_COOLDOWN_MS, falling back to defaults when unset or invalid.
 */
export function getBreakerConfigFromEnv(
  env: Record<string, string | undefined> = process.env
): { failureThreshold: number; cooldownMs: number } {
  return {
    failureThreshold: parsePositiveInt(
      env.SOROBAN_BREAKER_THRESHOLD,
      DEFAULT_BREAKER_THRESHOLD
    ),
    cooldownMs: parsePositiveInt(
      env.SOROBAN_BREAKER_COOLDOWN_MS,
      DEFAULT_BREAKER_COOLDOWN_MS
    ),
  };
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt: number | null = null;
  private trialInFlight = false;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = options.failureThreshold;
    this.cooldownMs = options.cooldownMs;
    this.now = options.now ?? (() => Date.now());
  }

  /** Current state, transitioning open -> half-open when the cool-down has elapsed. */
  getState(): CircuitState {
    if (this.state === 'open' && this.openedAt !== null) {
      if (this.now() - this.openedAt >= this.cooldownMs) {
        this.state = 'half-open';
        this.trialInFlight = false;
      }
    }
    return this.state;
  }

  /** Milliseconds until a trial request is allowed (0 when not open). */
  getRetryAfterMs(): number {
    if (this.getState() !== 'open' || this.openedAt === null) return 0;
    return Math.max(0, this.openedAt + this.cooldownMs - this.now());
  }

  snapshot(): CircuitBreakerSnapshot {
    return {
      state: this.getState(),
      failures: this.failures,
      failureThreshold: this.failureThreshold,
      cooldownMs: this.cooldownMs,
      openedAt: this.openedAt,
      retryAfterMs: this.getRetryAfterMs(),
    };
  }

  /**
   * Runs `fn` under breaker protection. Throws CircuitOpenError without
   * invoking `fn` when the circuit rejects the call.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();

    if (state === 'open') {
      throw new CircuitOpenError(this.getRetryAfterMs());
    }

    if (state === 'half-open') {
      // Only one trial request may pass through in half-open state.
      if (this.trialInFlight) {
        throw new CircuitOpenError(this.cooldownMs);
      }
      this.trialInFlight = true;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    } finally {
      this.trialInFlight = false;
    }
  }

  /** Manually reset to closed (primarily for tests and operator tooling). */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.openedAt = null;
    this.trialInFlight = false;
  }

  private onSuccess(): void {
    this.state = 'closed';
    this.failures = 0;
    this.openedAt = null;
  }

  private onFailure(): void {
    if (this.state === 'half-open') {
      this.open();
      return;
    }
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this.state = 'open';
    this.openedAt = this.now();
  }
}

let sharedBreaker: CircuitBreaker | null = null;

/** Process-wide breaker used by the Soroban client, configured from env. */
export function getSorobanBreaker(): CircuitBreaker {
  if (!sharedBreaker) {
    sharedBreaker = new CircuitBreaker(getBreakerConfigFromEnv());
  }
  return sharedBreaker;
}

/** Process-wide breaker state snapshot, used by /api/health. */
export function getSorobanBreakerSnapshot(): CircuitBreakerSnapshot {
  return getSorobanBreaker().snapshot();
}

/** Test helper: replace or clear the shared breaker instance. */
export function __setSorobanBreakerForTests(breaker: CircuitBreaker | null): void {
  sharedBreaker = breaker;
}
