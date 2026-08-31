/**
 * Client-side capability resolution for the emergency-transfer flow.
 *
 * The resolver contract is intentionally narrow: `(config) => Promise<TransferCapability>`.
 * Production consumers use {@link resolveServerCapability} (a `fetch` to the
 * server boundary route).  Test harnesses / stubs may inject a resolver that
 * simulates server state so the mutation gates can be exercised without a
 * live backend.
 *
 * The hook treats the resolver as the single authority: a resolved capability
 * is validated with {@link assertValidCapability} and a malformed response
 * fails CLOSED (the action is revoked) rather than proceeding.
 */

import {
  assertValidCapability,
  type TransferCapability,
} from '@/models/emergency-transfer-capability'
import type { ConfirmationPayload } from '@/lib/validations/emergency-transfer'
import type { EmergencyTransferConfig } from '@/models/emergency-transfer-config'

/**
 * Resolves the current transfer capability.  The hook re-invokes this at each
 * mutation boundary (open, bind, submit) so the decision always reflects the
 * latest server-derived state — never a stale client claim.
 */
export type TransferCapabilityResolver = (
  context: {
    config: EmergencyTransferConfig | null
    /** Payload bound during review, when a confirmation is pending. */
    pendingPayload: ConfirmationPayload | null
  },
) => Promise<TransferCapability>

/** Default resolver: asks the server boundary route for a fresh capability. */
export async function resolveServerCapability(
  context: Parameters<TransferCapabilityResolver>[0],
): Promise<TransferCapability> {
  const res = await fetch('/api/transfer-capability', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  // A 401/403 is a legitimate server-derived denial — parse and validate it.
  return assertValidCapability(await res.json())
}