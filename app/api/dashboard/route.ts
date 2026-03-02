import { compose, withAuth } from "@/lib/auth/middleware";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns all data needed to render the dashboard in a single round-trip.
 *
 * Authentication:
 *  Uses validatedRoute middleware with a Zod schema that reads the user's
 *  wallet address from the Authorization header (Bearer <wallet-address>)
 *  or from a `address` query param for local dev.
 *
 * Caching:
 *  Results are cached in-process for 30 s (DASHBOARD_TTL_SECONDS env var).
 *  The `meta.fromCache` field in the response tells the client whether it
 *  received a cached or freshly-fetched result.
 *  Cache-Control is set to `private, max-age=30` so browsers/CDNs won't
 *  cache across users, but the client can use the response for 30 s.
 *
 * Partial failures:
 *  If any contract dependency (RPC call) fails, the affected section returns
 *  `{ status: "error", error: "<message>" }` while all other sections return
 *  normally. The HTTP status is always 200 — check each section's `status`
 *  field to detect partial failures.
 *
 * Response shape: see DashboardResponse in dashboardAggregator.ts
 */

import { getDashboardData } from "@/lib/dashboard";
import { getSession } from "@/lib/session";

const DASHBOARD_TTL_S = Number(process.env.DASHBOARD_TTL_SECONDS) || 30;



export const getHandler = async (req: NextRequest) => {
    const session = await getSession();

    const dashboard = await getDashboardData(session?.address || "");

    return NextResponse.json(dashboard, {
      status: 200,
      headers: {
        // private = per-user, not cacheable by shared CDN/proxy
        "Cache-Control": `private, max-age=${DASHBOARD_TTL_S}, stale-while-revalidate=${DASHBOARD_TTL_S * 2}`,
        "X-Cache": dashboard.meta.fromCache ? "HIT" : "MISS",
      },
    });
  }



export const GET = compose(withAuth)(getHandler);