/**
 * Idempotency Store
 *
 * In-memory cache for idempotency keys with TTL support.
 * For production, replace with Redis or database storage.
 */

import { IdempotencyRecord, IdempotencyCheckResult } from './types';
import { registerGracefulShutdown, registerShutdownHook } from '@/lib/background/runtime';
import { registerCache } from '@/lib/cache/registry';

// In-memory store (replace with Redis/DB in production)
const store = new Map<string, IdempotencyRecord>();

// Default TTL: 24 hours
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Clean up expired records periodically
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.expiresAt < now) {
      store.delete(key);
    }
  }
}

// ── Startup: guarded against double-init under dev hot-reload ────────────────

let _cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanupTimer(): void {
  if (_cleanupTimer !== null) return;

  _cleanupTimer = setInterval(cleanupExpired, 60 * 60 * 1000);

  // unref() lets the process exit cleanly without waiting for the timer.
  if (typeof (_cleanupTimer as unknown as { unref?: () => void }).unref === 'function') {
    (_cleanupTimer as unknown as { unref: () => void }).unref();
  }

  registerGracefulShutdown();
  registerShutdownHook('idempotency_cleanup_timer', () => {
    if (_cleanupTimer !== null) {
      clearInterval(_cleanupTimer);
      _cleanupTimer = null;
    }
  });
  registerCache('idempotency_store', clearIdempotencyStore);
}

startCleanupTimer();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Store an idempotency record
 */
export function storeIdempotencyRecord(
  key: string,
  requestHash: string,
  response: { status: number; body: unknown; headers?: Record<string, string> },
  ttlMs: number = DEFAULT_TTL_MS
): void {
  const now = Date.now();
  const record: IdempotencyRecord = {
    key,
    requestHash,
    response,
    createdAt: now,
    expiresAt: now + ttlMs,
  };
  store.set(key, record);
}

/**
 * Check if an idempotency key exists and validate request
 */
export function checkIdempotencyKey(
  key: string,
  requestHash: string
): IdempotencyCheckResult {
  const record = store.get(key);

  if (!record) {
    return { exists: false, conflict: false };
  }

  // Check if expired
  if (record.expiresAt < Date.now()) {
    store.delete(key);
    return { exists: false, conflict: false };
  }

  // Check if request body matches
  if (record.requestHash !== requestHash) {
    return { exists: true, record, conflict: true };
  }

  return { exists: true, record, conflict: false };
}

/**
 * Delete an idempotency record (for testing or manual cleanup)
 */
export function deleteIdempotencyRecord(key: string): boolean {
  return store.delete(key);
}

/**
 * Clear all idempotency records (for testing)
 */
export function clearIdempotencyStore(): void {
  store.clear();
}

/**
 * Get store size (for monitoring)
 */
export function getStoreSize(): number {
  return store.size;
}
