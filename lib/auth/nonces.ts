/**
 * Prisma-backed single-use nonce service for wallet-based authentication.
 *
 * Replaces both lib/auth-cache.ts and lib/auth/nonce-store.ts.
 *
 * Invariants:
 *  - One nonce per address (address is the primary key).
 *  - Nonces expire after NONCE_TTL_MS (5 minutes).
 *  - consumeNonce performs a constant-time compare and deletes in one
 *    atomic transaction so replay attacks are impossible even under
 *    concurrent requests.
 */

import { prisma } from '@/lib/prisma';
import { timingSafeEqual } from 'crypto';
import { randomBytes } from 'crypto';

export const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Issues a fresh nonce for `address`, replacing any prior entry.
 * Returns the nonce string and its expiry as an ISO timestamp.
 */
export async function issueNonce(address: string): Promise<{ nonce: string; expiresAt: string }> {
  const nonce = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

  await prisma.authNonce.upsert({
    where: { address },
    create: { address, nonce, expiresAt },
    update: { nonce, expiresAt },
  });

  return { nonce, expiresAt: expiresAt.toISOString() };
}

/**
 * Verifies `nonce` for `address` and, if valid, deletes it atomically.
 *
 * Returns `true` on success. Returns `false` if:
 *  - no nonce exists for the address,
 *  - the nonce does not match (constant-time compare), or
 *  - the nonce has expired.
 *
 * The delete happens inside the same transaction as the read so a
 * concurrent call with the same nonce will find no row and return false.
 */
export async function consumeNonce(address: string, nonce: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const record = await tx.authNonce.findUnique({ where: { address } });

    if (!record) return false;

    // Always delete — expired or not — so stale rows don't accumulate.
    await tx.authNonce.delete({ where: { address } });

    if (record.expiresAt <= new Date()) return false;

    // Constant-time comparison to prevent timing attacks.
    const expected = Buffer.from(record.nonce, 'utf8');
    const provided = Buffer.from(nonce, 'utf8');
    if (expected.length !== provided.length) return false;

    return timingSafeEqual(expected, provided);
  });
}
