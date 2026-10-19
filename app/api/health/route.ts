/**
 * app/api/health/route.ts
 *
 * GET /api/health
 *
 * Returns 200 when all critical dependencies are healthy, 503 otherwise.
 * Response always includes: status, database, rpc, anchor, timestamp.
 */

import { NextResponse } from "next/server";
import {
  getLatestLedger,
  getNetworkPassphrase,
  SorobanClientError,
} from "@/lib/soroban/client";
import { prisma } from "@/lib/prisma";
import {
  getResolvedContractIds,
  getSorobanNetwork,
} from "@/lib/contracts/network-resolution";

export const runtime = "nodejs";

export async function GET() {
  const network = getSorobanNetwork();
  const includeContractDetails =
    process.env.NODE_ENV !== "production" ||
    process.env.HEALTH_INCLUDE_CONTRACT_IDS === "true";

  // ── 1. Database ─────────────────────────────────────────────────
  let database: { reachable: boolean; error?: string };
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]);
    database = { reachable: true };
  } catch (err: any) {
    database = { reachable: false, error: err?.message ?? "unreachable" };
  }

  // ── 2. Soroban RPC ───────────────────────────────────────────────
  let rpc: {
    reachable: boolean;
    latestLedger?: number;
    protocolVersion?: number;
    networkPassphrase?: string;
    network?: string;
    error?: string;
  };
  try {
    const ledger = await getLatestLedger();
    rpc = {
      reachable: true,
      latestLedger: ledger.sequence,
      protocolVersion: Number(ledger.protocolVersion),
      networkPassphrase: getNetworkPassphrase(),
      network,
    };
  } catch (err) {
    rpc = {
      reachable: false,
      network,
      error:
        err instanceof SorobanClientError
          ? err.message
          : "Unexpected error contacting Soroban RPC",
    };
  }

  // ── 3. Anchor ────────────────────────────────────────────────────
  // Issue #1518 – report a real, typed anchor status instead of the old
  // hardcoded `{ reachable: true }` placeholder the e2e contract forbids:
  // 'not_configured' when ANCHOR_PLATFORM_URL is unset, otherwise probe the
  // URL and report 'ok' / 'error' with reachable reflecting the outcome.
  let anchor: {
    status: "ok" | "error" | "not_configured";
    reachable: boolean;
    error?: string;
  };
  const anchorUrl = process.env.ANCHOR_PLATFORM_URL;
  if (!anchorUrl) {
    anchor = { status: "not_configured", reachable: false };
  } else {
    try {
      const res = await fetch(anchorUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
      });
      anchor = res.ok
        ? { status: "ok", reachable: true }
        : {
            status: "error",
            reachable: false,
            error: `anchor responded ${res.status}`,
          };
    } catch (e) {
      anchor = {
        status: "error",
        reachable: false,
        error: e instanceof Error ? e.message : "anchor probe failed",
      };
    }
  }

  // ── 4. Overall status ────────────────────────────────────────────
  const healthy = database.reachable && rpc.reachable;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      rpc,
      anchor,
      contractIds: includeContractDetails ? getResolvedContractIds() : undefined,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}