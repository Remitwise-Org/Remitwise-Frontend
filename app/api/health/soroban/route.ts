/**
 * app/api/health/route.ts
 *
 * GET /api/health
 *
 * Returns 200 when the Soroban RPC node is reachable, 503 otherwise.
 * This satisfies the acceptance criterion:
 *   "Client used in at least one route (e.g. health or contract read)"
 */

import { NextResponse } from "next/server";
import { withApiLogger } from "@/lib/api-logger-middleware";
import {
  getLatestLedger,
  getNetworkPassphrase,
  SorobanClientError,
} from "@/lib/soroban/client";

export const runtime = "nodejs";

export const GET = withApiLogger(async () => {
  try {
    const ledger = await getLatestLedger();

    return NextResponse.json(
      {
        status: "ok",
        soroban: {
          rpcReachable: true,
          latestLedger: ledger.sequence,
          protocolVersion: ledger.protocolVersion,
          networkPassphrase: getNetworkPassphrase(),
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof SorobanClientError
        ? err.message
        : "Unexpected error contacting Soroban RPC";

    console.error("[/api/health] Soroban RPC unreachable:", err);

    return NextResponse.json(
      {
        status: "degraded",
        soroban: {
          rpcReachable: false,
          error: message,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
});