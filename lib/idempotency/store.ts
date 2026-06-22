/**
 * Idempotency Store
 * 
 * In-memory cache for idempotency keys with TTL support.
 * For production, replace with Redis or database storage.
 */

import { registerShutdownHook } from '../background/runtime';
import { registerCache } from '../cache/registry';
import { IdempotencyRecord, IdempotencyCheckResult } from './types';

// In-memory store (replace with Redis/DB in production)
const store = new Map<string, IdempotencyRecord>();

// Default TTL: 24 hours
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const CLEANUP_TIMER_KEY = '__remitwiseIdempotencyCleanupTimer';

type CleanupTimer = ReturnType<typeof setInterval>;
type CleanupTimerGlobal = typeof globalThis & {
    [CLEANUP_TIMER_KEY]?: CleanupTimer;
};

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

function startCleanupTimer(): CleanupTimer {
    const cleanupGlobal = globalThis as CleanupTimerGlobal;
    if (cleanupGlobal[CLEANUP_TIMER_KEY]) {
        return cleanupGlobal[CLEANUP_TIMER_KEY];
    }

    const cleanupTimer = setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);
    if (typeof cleanupTimer.unref === 'function') {
        cleanupTimer.unref();
    }

    cleanupGlobal[CLEANUP_TIMER_KEY] = cleanupTimer;
    return cleanupTimer;
}

const cleanupTimer = startCleanupTimer();

registerShutdownHook('idempotency_store_cleanup', () => {
    clearInterval(cleanupTimer);
    delete (globalThis as CleanupTimerGlobal)[CLEANUP_TIMER_KEY];
});

registerCache('idempotency_store', clearIdempotencyStore);

/**
 * Store an idempotency record
 */
export function storeIdempotencyRecord(
    key: string,
    requestHash: string,
    response: { status: number; body: any; headers?: Record<string, string> },
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
