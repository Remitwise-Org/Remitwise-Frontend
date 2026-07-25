/**
 * @deprecated Use `lib/soroban/client.ts` instead.
 *
 * This module used `NEXT_PUBLIC_SOROBAN_RPC_URL` (browser-exposed) and hardcoded
 * `Networks.TESTNET`, causing savings-goal transactions to build against the wrong
 * network in production.
 *
 * All callers have been migrated to the canonical server-only client at
 * `lib/soroban/client.ts`, which:
 *  - reads `SOROBAN_RPC_URL` (server-only, never bundled into the browser)
 *  - resolves the network passphrase via `getSorobanNetworkPassphrase()`
 *  - wraps every RPC call with retry + per-attempt timeout logic
 *
 * This file is kept temporarily so any external tooling that imports it
 * continues to compile. It will be removed in a future cleanup commit.
 */

export {
  getServer as getSorobanClient,
  getNetworkPassphrase,
  getLatestLedger,
  getLedgerSequence,
  SorobanClientError,
} from "./soroban/client";
