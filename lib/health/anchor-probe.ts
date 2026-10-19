/**
 * lib/health/anchor-probe.ts
 *
 * Shared Anchor Platform health probe used by both `/api/health` and
 * `/api/v1/health` so the two routes can never report a different anchor
 * status for the same deployment.
 *
 * Server-only: reads `ANCHOR_PLATFORM_URL` (a non-public secret). Both callers
 * run on the Node.js runtime; this module must not be imported into client
 * code. The URL is never exposed in the response, only the resulting status.
 *
 * Returns a transport-neutral result. Each route maps it into its own response
 * shape (the legacy route uses an object with `reachable`; the v1 route uses a
 * string enum), so neither route's existing contract is changed.
 */

export type AnchorProbeStatus = "ok" | "error" | "not_configured";

export interface AnchorProbeResult {
  /** High-level outcome of the probe. */
  status: AnchorProbeStatus;
  /** Convenience boolean for the legacy object shape. True only when status is "ok". */
  reachable: boolean;
  /** HTTP status when the anchor responded (present for "ok" and HTTP-level "error"). */
  httpStatus?: number;
  /** Human-readable detail for network/timeout failures (absent on HTTP-level errors). */
  error?: string;
}

/** Default probe timeout, mirroring the anchor/soroban client timeout pattern. */
export const ANCHOR_PROBE_TIMEOUT_MS = 5000;

/**
 * Probes the configured Anchor Platform `/info` endpoint with a short timeout.
 *
 * - Unset `ANCHOR_PLATFORM_URL` -> `not_configured` (never a fake "reachable").
 * - 2xx                        -> `ok`.
 * - non-2xx                    -> `error` with `httpStatus`.
 * - timeout / network error    -> `error` with `error` message.
 *
 * Never throws; failures are encoded in the result so callers can keep the
 * anchor non-critical to overall health.
 */
export async function probeAnchor(
  timeoutMs: number = ANCHOR_PROBE_TIMEOUT_MS
): Promise<AnchorProbeResult> {
  const anchorUrl = process.env.ANCHOR_PLATFORM_URL;
  if (!anchorUrl) {
    return { status: "not_configured", reachable: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Standard SEP "info" endpoint; a 2xx means the anchor is serving requests.
    const res = await fetch(`${anchorUrl}/info`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { status: "ok", reachable: true, httpStatus: res.status };
    }
    return { status: "error", reachable: false, httpStatus: res.status };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error =
      err instanceof Error && err.name === "AbortError"
        ? `Anchor probe timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : "Anchor probe failed";
    return { status: "error", reachable: false, error };
  }
}