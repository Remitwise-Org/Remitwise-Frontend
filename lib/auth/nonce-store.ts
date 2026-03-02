/**
 * Nonce Store for Authentication
 * 
 * Stores nonces temporarily for signature-based authentication.
 * In production, replace with Redis or database storage.
 */

interface NonceRecord {
    nonce: string;
    address: string;
    createdAt: number;
    expiresAt: number;
}

const globalForNonce = globalThis as unknown as { nonceStore: Map<string, NonceRecord> };
const nonceStore = globalForNonce.nonceStore || new Map<string, NonceRecord>();
if (process.env.NODE_ENV !== "production") globalForNonce.nonceStore = nonceStore;

// Default TTL: 5 minutes
const DEFAULT_NONCE_TTL_MS = 5 * 60 * 1000;

/**
 * Clean up expired nonces periodically
 */
function cleanupExpiredNonces() {
    const now = Date.now();
    for (const [key, record] of nonceStore.entries()) {
        if (record.expiresAt < now) {
            nonceStore.delete(key);
        }
    }
}

// Run cleanup every minute
setInterval(cleanupExpiredNonces, 60 * 1000);

/**
 * Store a nonce for an address
 */
export function storeNonce(
    address: string,
    nonce: string,
    ttlMs: number = DEFAULT_NONCE_TTL_MS
): void {
    console.log(`[NONCE-STORE] Storing nonce for ${address}: ${nonce}`);
    const now = Date.now();
    const record: NonceRecord = {
        nonce,
        address,
        createdAt: now,
        expiresAt: now + ttlMs,
    };

    // Use address as key to ensure one nonce per address
    nonceStore.set(address, record);
}

/**
 * Retrieve and validate a nonce for an address
 * Returns the nonce if valid, null if expired or not found
 */
export function getNonce(address: string): string | null {
    console.log(`[NONCE-STORE] Getting nonce for ${address}. Current store size: ${nonceStore.size}, store keys:`, Array.from(nonceStore.keys()));
    const record = nonceStore.get(address);

    if (!record) {
        return null;
    }

    // Check if expired
    if (record.expiresAt < Date.now()) {
        nonceStore.delete(address);
        return null;
    }

    return record.nonce;
}

/**
 * Delete a nonce after successful authentication
 */
export function deleteNonce(address: string): boolean {
    return nonceStore.delete(address);
}

/**
 * Clear all nonces (for testing)
 */
export function clearNonceStore(): void {
    nonceStore.clear();
}

/**
 * Get store size (for monitoring)
 */
export function getNonceStoreSize(): number {
    return nonceStore.size;
}
