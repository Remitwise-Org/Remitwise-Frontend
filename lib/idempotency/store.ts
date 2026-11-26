/**
 * Idempotency Store
 *
 * Prisma-backed implementation with TTL expiry and unique-key constraint.
 * Concurrent first-use of the same key is serialised by the PRIMARY KEY
 * constraint — a Prisma P2002 unique-violation error is caught and the
 * winning record (written by the first request) is returned instead.
 *
 * In-memory fallback is used when IDEMPOTENCY_USE_MEMORY=1 (test mode) or
 * when the Prisma client is unavailable.
 */

import { registerCache } from '@/lib/cache/registry';
import { registerGracefulShutdown, registerShutdownHook } from '@/lib/background/runtime';
import { IdempotencyRecord, IdempotencyCheckResult } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** True when the in-memory store should be used (tests or no DB). */
function shouldUseMemoryStore(): boolean {
  return process.env.IDEMPOTENCY_USE_MEMORY === '1' || process.env.NODE_ENV === 'test';
}

/** Convert a Prisma DB row to IdempotencyRecord. */
function rowToRecord(row: {
  key: string;
  requestHash: string;
  responseBody: string;
  statusCode: number;
  expiresAt: Date;
  createdAt: Date;
}): IdempotencyRecord {
  return {
    key: row.key,
    requestHash: row.requestHash,
    response: JSON.parse(row.responseBody) as { status: number; body: unknown; headers?: Record<string, string> },
    createdAt: row.createdAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
  };
}

// ---------------------------------------------------------------------------
// In-memory store (tests / fallback)
// ---------------------------------------------------------------------------

const memStore = new Map<string, IdempotencyRecord>();

// ---------------------------------------------------------------------------
// Prisma lazy import (avoids pulling in prisma at module load in edge/test)
// ---------------------------------------------------------------------------

async function getPrisma() {
  const { prisma } = await import('@/lib/prisma');
  return prisma;
}

// ---------------------------------------------------------------------------
// Public API  (all async)
// ---------------------------------------------------------------------------

/**
 * Store an idempotency record. On concurrent first-use with the same key the
 * database unique constraint ensures only one write wins (P2002 is swallowed).
 */
export async function storeIdempotencyRecord(
  key: string,
  requestHash: string,
  response: { status: number; body: unknown; headers?: Record<string, string> },
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<void> {
  const now = Date.now();
  const expiresAt = new Date(now + ttlMs);

  if (shouldUseMemoryStore()) {
    memStore.set(key, {
      key,
      requestHash,
      response,
      createdAt: now,
      expiresAt: now + ttlMs,
    });
    return;
  }

  try {
    const db = await getPrisma();
    await (db as any).idempotencyRecord.create({
      data: {
        key,
        requestHash,
        responseBody: JSON.stringify(response),
        statusCode: response.status,
        expiresAt,
      },
    });
  } catch (err: any) {
    // P2002 = unique constraint violation — another concurrent request already
    // stored the record; this is not an error — the first writer wins.
    if (err?.code !== 'P2002') {
      throw err;
    }
  }
}

/**
 * Check if an idempotency key exists and whether the request hash matches.
 */
export async function checkIdempotencyKey(
  key: string,
  requestHash: string,
): Promise<IdempotencyCheckResult> {
  if (shouldUseMemoryStore()) {
    const record = memStore.get(key);
    if (!record) return { exists: false, conflict: false };
    if (record.expiresAt < Date.now()) {
      memStore.delete(key);
      return { exists: false, conflict: false };
    }
    if (record.requestHash !== requestHash) {
      return { exists: true, record, conflict: true };
    }
    return { exists: true, record, conflict: false };
  }

  const db = await getPrisma();
  const row = await (db as any).idempotencyRecord.findUnique({ where: { key } });

  if (!row) return { exists: false, conflict: false };

  // Treat expired records as non-existent (lazy expiry).
  if (new Date(row.expiresAt) < new Date()) {
    await (db as any).idempotencyRecord.delete({ where: { key } }).catch(() => {});
    return { exists: false, conflict: false };
  }

  const record = rowToRecord(row);
  if (row.requestHash !== requestHash) {
    return { exists: true, record, conflict: true };
  }
  return { exists: true, record, conflict: false };
}

/**
 * Delete an idempotency record.
 */
export async function deleteIdempotencyRecord(key: string): Promise<boolean> {
  if (shouldUseMemoryStore()) {
    return memStore.delete(key);
  }
  const db = await getPrisma();
  try {
    await (db as any).idempotencyRecord.delete({ where: { key } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all idempotency records (tests / admin).
 */
export async function clearIdempotencyStore(): Promise<void> {
  if (shouldUseMemoryStore()) {
    memStore.clear();
    return;
  }
  const db = await getPrisma();
  await (db as any).idempotencyRecord.deleteMany({});
}

export function reserveIdempotencyKey(
    key: string,
    requestHash: string,
    ttlMs: number = DEFAULT_TTL_MS
): { reserved: boolean; conflict: boolean; inFlight: boolean } {
    const existing = memStore.get(key);
    const now = Date.now();

    if (existing) {
        if (existing.expiresAt < now) {
            memStore.delete(key);
        } else if (existing.requestHash !== requestHash) {
            return { reserved: false, conflict: true, inFlight: false };
        } else if (existing.inFlight) {
            return { reserved: false, conflict: false, inFlight: true };
        } else {
            return { reserved: false, conflict: false, inFlight: false };
        }
    }

    memStore.set(key, {
        key,
        requestHash,
        inFlight: true,
        createdAt: now,
        expiresAt: now + ttlMs,
    });
    return { reserved: true, conflict: false, inFlight: false };
}

export function releaseIdempotencyKey(key: string): void {
    memStore.delete(key);
}

/**
 * Purge expired records. Called by the background runtime on a schedule.
 */
export async function purgeExpiredIdempotencyRecords(): Promise<void> {
  if (shouldUseMemoryStore()) {
    const now = Date.now();
    for (const [k, r] of memStore.entries()) {
      if (r.expiresAt < now) memStore.delete(k);
    }
    return;
  }
  const db = await getPrisma();
  await (db as any).idempotencyRecord.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

/**
 * Return current store size (monitoring / tests).
 */
export async function getStoreSize(): Promise<number> {
  if (shouldUseMemoryStore()) return memStore.size;
  const db = await getPrisma();
  return (db as any).idempotencyRecord.count();
}

// ---------------------------------------------------------------------------
// Synchronous shims — kept for backward-compat with existing callers that
// have not yet been migrated to async. They delegate to the memory store
// only and log a warning in non-test environments.
// ---------------------------------------------------------------------------

/** @deprecated use the async storeIdempotencyRecord */
export function storeIdempotencyRecordSync(
  key: string,
  requestHash: string,
  response: { status: number; body: unknown; headers?: Record<string, string> },
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  const now = Date.now();
  memStore.set(key, { key, requestHash, response, createdAt: now, expiresAt: now + ttlMs });
}

/** @deprecated use the async checkIdempotencyKey */
export function checkIdempotencyKeySync(
  key: string,
  requestHash: string,
): IdempotencyCheckResult {
  const record = memStore.get(key);
  if (!record) return { exists: false, conflict: false };
  if (record.expiresAt < Date.now()) { memStore.delete(key); return { exists: false, conflict: false }; }
  if (record.requestHash !== requestHash) return { exists: true, record, conflict: true };
  return { exists: true, record, conflict: false };
}

// ---------------------------------------------------------------------------
// Timer & lifecycle
// ---------------------------------------------------------------------------

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let cleanupInitialized = false;

function initializeCleanup(): void {
  if (cleanupInitialized) return;
  cleanupInitialized = true;

  cleanupTimer = setInterval(() => { void purgeExpiredIdempotencyRecords(); }, 60 * 60 * 1000);

  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();

  registerGracefulShutdown();
  registerShutdownHook('idempotency_cleanup', () => {
    if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }
  });
  registerCache('idempotency', () => void clearIdempotencyStore());
}

initializeCleanup();

export function resetIdempotencyCleanup(): void {
  if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }
  cleanupInitialized = false;
}

export function isCleanupActive(): boolean { return cleanupTimer !== null; }

export function startIdempotencyCleanup(): void { initializeCleanup(); }
