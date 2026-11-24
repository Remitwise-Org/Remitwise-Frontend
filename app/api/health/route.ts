/**
 * app/api/health/route.ts
 *
 * GET /api/health
 *
 * Returns 200 when all critical dependencies are healthy, 503 otherwise.
 * Response always includes: status, database, rpc, anchor, timestamp.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLatestLedger,
  getNetworkPassphrase,
  SorobanClientError,
} from "@/lib/soroban/client";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/admin/auth";
import {
  getResolvedContractIds,
  getSorobanNetwork,
} from "@/lib/contracts/network-resolution";
import { probeAnchor } from "@/lib/health/anchor-probe";
import { getCachedHealthProbes } from "@/lib/health/probe-cache";
import type { HealthProbeResults } from "@/lib/health/probe-cache";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const network = getSorobanNetwork();
  const includeContractDetails =
    process.env.NODE_ENV !== "production" ||
    process.env.HEALTH_INCLUDE_CONTRACT_IDS === "true";
  const freshRequested = new URL(request.url).searchParams.get("fresh") === "1";
  const bypassCache = freshRequested && isAdminAuthorized(request);

  const { results, cachedAgeMs } = await getCachedHealthProbes(async () => {
    const [database, rpc, anchorResult] = await Promise.all([
      (async (): Promise<HealthProbeResults["database"]> => {
        try {
          await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Database query timeout")), 5000)
            ),
          ]);
          return { reachable: true };
        } catch (err: unknown) {
          const error =
            err instanceof Error
              ? err.message
              : typeof err === "object" &&
                  err !== null &&
                  "message" in err &&
                  typeof err.message === "string"
                ? err.message
                : "unreachable";
          return {
            reachable: false,
            error,
          };
        }
      })(),
      (async (): Promise<HealthProbeResults["rpc"]> => {
        try {
          const ledger = await getLatestLedger();
          return {
            reachable: true,
            latestLedger: ledger.sequence,
            protocolVersion: Number(ledger.protocolVersion),
            networkPassphrase: getNetworkPassphrase(),
            network,
          };
        } catch (err: unknown) {
          return {
            reachable: false,
            network,
            error:
              err instanceof SorobanClientError
                ? err.message
                : "Unexpected error contacting Soroban RPC",
          };
        }
      })(),
      probeAnchor().then((result) => ({
        status: result.status,
        reachable: result.reachable,
        error:
          result.error ??
          (result.httpStatus !== undefined
            ? `anchor responded ${result.httpStatus}`
            : undefined),
      })),
    ]);

    return { database, rpc, anchor: anchorResult };
  }, bypassCache);

  // ── 4. Overall status ────────────────────────────────────────────
  const { database, rpc, anchor } = results;
  const healthy = database.reachable && rpc.reachable;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      rpc,
      anchor,
      contractIds: includeContractDetails ? getResolvedContractIds() : undefined,
      timestamp: new Date().toISOString(),
      cachedAgeMs,
    },
    { status: healthy ? 200 : 503 }
  );
}