/**
 * In-memory nonce cache for wallet-based authentication.
 *
 * Each nonce is single-use: getAndClearNonce() atomically reads and
 * deletes it so replay attacks are impossible.
 *
 * TTL: nonces expire after 5 minutes. A background timer sweeps
 * stale entries every minute so memory doesn't grow unbounded.
 */
import { registerCache } from '@/lib/cache/registry';
import { registerGracefulShutdown, registerShutdownHook } from '@/lib/background/runtime';

interface NonceEntry {
  nonce: string;
  expiresAt: number; // ms epoch
}

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SWEEP_INTERVAL_MS = 60 * 1000; // 1 minute

const cache = new Map<string, NonceEntry>();

// ── Sweep expired entries ──────────────────────
// setInterval keeps the module alive in long-running processes;
// unref() prevents it from blocking process exit in tests/CLI.
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [address, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(address);
    }
  }
}, SWEEP_INTERVAL_MS);

if (typeof sweepTimer.unref === 'function') {
  sweepTimer.unref();
}

registerGracefulShutdown();
registerShutdownHook('auth_nonce_sweeper', () => {
  clearInterval(sweepTimer);
});
registerCache('auth_nonces', () => {
  cache.clear();
});

// ── Public API ─────────────────────────────────

/**
 * Stores a nonce for `address`, overwriting any previous entry.
 * The nonce expires after NONCE_TTL_MS milliseconds.
 */
export function setNonce(address: string, nonce: string): void {
  cache.set(address, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
}

/**
 * Retrieves and immediately deletes the nonce for `address`.
 * Returns `null` if no nonce exists or it has expired.
 *
 * The atomic read-then-delete prevents replay attacks.
 */
export function getAndClearNonce(address: string): string | null {
  const entry = cache.get(address);
  if (!entry) return null;

  // Always delete — even if expired — to keep cache clean.
  cache.delete(address);

  if (entry.expiresAt <= Date.now()) return null;

  return entry.nonce;
}

export function clearNonceCache(): void {
  cache.clear();
}
