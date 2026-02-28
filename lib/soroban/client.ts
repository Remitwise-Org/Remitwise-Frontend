/**
 * lib/soroban/client.ts
 *
 * Server-side Soroban RPC client.
 * Used by Next.js API routes to read contract state and build transactions.
 *
 * RPC URL format
 * ──────────────
 * Testnet : https://soroban-testnet.stellar.org
 * Mainnet : https://soroban.stellar.org
 *
 * Set SOROBAN_RPC_URL in your .env.local (never expose it to the browser).
 * NEXT_PUBLIC_* variables are bundled into the client; this one must NOT have
 * that prefix so it stays server-only.
 */

import { SorobanRpc, Networks } from "@stellar/stellar-sdk";
import { env } from "@/lib/env";

// ── Configuration ─────────────────────────────────────────────────────────────

const RPC_URL = env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

const NETWORK_PASSPHRASE =
  env.SOROBAN_NETWORK_PASSPHRASE ?? Networks.TESTNET;

/** How long (ms) to wait for a single RPC call before aborting. */
const TIMEOUT_MS = 10_000;

/** Number of additional attempts after the first failure. */
const MAX_RETRIES = 1;

// ── Singleton server instance ─────────────────────────────────────────────────

let _server: SorobanRpc.Server | null = null;

/**
 * Returns a cached `SorobanRpc.Server` instance.
 * Initialisation is lazy so the module can be imported at the top level
 * without crashing during builds where env vars may not be present.
 */
export function getServer(): SorobanRpc.Server {
  if (!_server) {
    _server = new SorobanRpc.Server(RPC_URL, {
      allowHttp: RPC_URL.startsWith("http://"),
    });
  }
  return _server;
}

/**
 * Returns the Stellar network passphrase configured for this deployment.
 * Use this when building or verifying transactions server-side.
 */
export function getNetworkPassphrase(): string {
  return NETWORK_PASSPHRASE;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Wraps an async RPC call with a per-attempt timeout and a single automatic
 * retry on failure.
 *
 * @param label  Human-readable name used in error messages.
 * @param fn     Factory that produces the promise to execute.
 */
async function withRetry<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Race the RPC call against the timeout signal.
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          controller.signal.addEventListener("abort", () =>
            reject(new Error(`RPC call "${label}" timed out after ${TIMEOUT_MS} ms`))
          )
        ),
      ]);
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        console.warn(
          `[soroban] "${label}" failed (attempt ${attempt + 1}), retrying…`,
          err
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new SorobanClientError(
    `RPC call "${label}" failed after ${MAX_RETRIES + 1} attempt(s)`,
    lastError
  );
}

// ── Public RPC helpers ────────────────────────────────────────────────────────

/**
 * Fetches the latest ledger from the RPC node.
 * Useful for health checks and for populating `timebounds` when building
 * transactions.
 *
 * @throws {SorobanClientError} when the network is unreachable or times out.
 */
export async function getLatestLedger(): Promise<SorobanRpc.Api.GetLatestLedgerResponse> {
  return withRetry("getLatestLedger", () =>
    getServer().getLatestLedger()
  );
}

/**
 * Fetches the current ledger sequence number only.
 * Convenience wrapper around `getLatestLedger`.
 */
export async function getLedgerSequence(): Promise<number> {
  const { sequence } = await getLatestLedger();
  return sequence;
}

// ── Error type ────────────────────────────────────────────────────────────────

/** Typed error thrown by this module so callers can distinguish RPC failures. */
export class SorobanClientError extends Error {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "SorobanClientError";
    this.cause = cause;
  }
}
