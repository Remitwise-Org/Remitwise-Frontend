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
  // Probe the anchor platform URL if configured (non-critical check)
  let anchor: { reachable: boolean; error?: string };
  const anchorUrl = process.env.ANCHOR_PLATFORM_URL;
  if (anchorUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${anchorUrl}/info`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        anchor = { reachable: true };
      } else {
        anchor = { reachable: false, error: `Anchor returned status ${res.status}` };
      }
    } catch (err: any) {
      anchor = { reachable: false, error: err?.message ?? "unreachable" };
    }
  } else {
    anchor = { reachable: false, error: "ANCHOR_PLATFORM_URL not configured" };
  }

  // ── 4. Overall status ────────────────────────────────────────────
  // Anchor is non-critical: only database and RPC determine overall health
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
