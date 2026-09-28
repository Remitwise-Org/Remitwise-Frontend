interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

const NONCE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, NonceEntry>();

const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [address, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(address);
    }
  }
}, 60 * 1000);

if (typeof sweepTimer.unref === 'function') {
  sweepTimer.unref();
}

export function setNonce(address: string, nonce: string): void {
  cache.set(address, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
}

export function getAndClearNonce(address: string): string | null {
  const entry = cache.get(address);
  if (!entry) return null;

  cache.delete(address);

  if (entry.expiresAt <= Date.now()) return null;

  return entry.nonce;
}

export function clearNonceCache(): void {
  cache.clear();
}
