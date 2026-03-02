/**
 * dashboardAggregator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Aggregates all dashboard sections by calling the contract service in parallel.
 *
 * Design principles:
 *  • Every section is fetched concurrently via Promise.allSettled — one failing
 *    contract call never blocks the rest of the dashboard.
 *  • Each section carries its own `status` ("ok" | "error") and optional
 *    `error` string so the client can render partial data gracefully.
 *  • Results are cached in-process for DASHBOARD_TTL_SECONDS (default 30 s).
 *    Cache key is the user's wallet address, so each user gets their own entry.
 *
 * Cache TTL: 30 s (override with DASHBOARD_TTL_SECONDS env var)
 */

import {
  getRemittanceSummary,
  getSavingsSummary,
  getBillsSummary,
  getInsuranceSummary,
} from "@/lib/contracts/dashboard-aggregate";
import { DashboardResponse } from "./types/dashboard";

// ─── TTL cache (in-process, per-user) 

const TTL_MS = (Number(process.env.DASHBOARD_TTL_SECONDS) || 30) * 1_000;

interface CacheEntry {
  data: DashboardResponse;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

function getCached(key: string): DashboardResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key: string, data: DashboardResponse): void {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

// ─── Response shape ────────────────────────────────────────────────────────

/**
 * Each section is wrapped in a SectionResult so the client always knows
 * whether data is fresh, stale, or unavailable.
 *
 * GET /api/dashboard response shape:
 * ┌────────────────────────┬───────────────────────┬──────────────────────────────────────────────────────┐
 * │ Field                  │ Type                  │ Description                                          │
 * ├────────────────────────┼───────────────────────┼──────────────────────────────────────────────────────┤
 * │ remittance.status      │ "ok" | "error"        │ Whether the remittance section loaded                │
 * │ remittance.totalSent   │ number?               │ Lifetime USD sent                                    │
 * │ remittance.split       │ object?               │ % breakdown by destination currency                  │
 * │ remittance.recentTx    │ array?                │ Last 10 transactions                                 │
 * │ savings.status         │ "ok" | "error"        │ Whether the savings section loaded                   │
 * │ savings.savingsTotal   │ number?               │ Sum of all goal balances                             │
 * │ savings.recentGoals    │ array?                │ Up to 5 most recent goals                            │
 * │ bills.status           │ "ok" | "error"        │ Whether the bills section loaded                     │
 * │ bills.billsPaidCount   │ number?               │ Bills paid this period                               │
 * │ bills.billsPaidAmount  │ number?               │ Total paid amount this period                        │
 * │ bills.unpaidBills      │ array?                │ All outstanding bills                                │
 * │ insurance.status       │ "ok" | "error"        │ Whether the insurance section loaded                 │
 * │ insurance.policiesCount│ number?               │ Active policy count                                  │
 * │ insurance.premium      │ number?               │ Total monthly premium                                │
 * │ insurance.policies     │ array?                │ All active policies                                  │
 * │ meta.cachedAt          │ string                │ ISO-8601 timestamp when this response was built      │
 * │ meta.ttlSeconds        │ number                │ How long this response is cached (seconds)           │
 * │ meta.fromCache         │ boolean               │ Whether this response came from the in-process cache │
 * └────────────────────────┴───────────────────────┴──────────────────────────────────────────────────────┘
 */





// ─── Aggregator ────────────────────────────────────────────────────────────

export async function getDashboardData(
  userAddress: string
): Promise<DashboardResponse> {
  // Return cached response if still fresh
  const cached = getCached(userAddress);
  if (cached) {
    return { ...cached, meta: { ...cached.meta, fromCache: true } };
  }

  // Fire all four contract service calls concurrently.
  // Promise.allSettled ensures no single failure cancels the others.
  const [remittanceResult, savingsResult, billsResult, insuranceResult] =
    await Promise.allSettled([
      getRemittanceSummary(userAddress),
      getSavingsSummary(userAddress),
      getBillsSummary(userAddress),
      getInsuranceSummary(userAddress),
    ]);

  // ── Map each settled result to a typed SectionResult ──────────────────

  const remittance: DashboardResponse["remittance"] =
    remittanceResult.status === "fulfilled"
      ? {
          status: "ok",
          totalSent: remittanceResult.value.totalSent,
          split: remittanceResult.value.split,
          recentTransactions: remittanceResult.value.recentTransactions,
        }
      : {
          status: "error",
          error: toMessage(remittanceResult.reason),
        };

  const savings: DashboardResponse["savings"] =
    savingsResult.status === "fulfilled"
      ? {
          status: "ok",
          savingsTotal: savingsResult.value.savingsTotal,
          recentGoals: savingsResult.value.recentGoals,
        }
      : {
          status: "error",
          error: toMessage(savingsResult.reason),
        };

  const bills: DashboardResponse["bills"] =
    billsResult.status === "fulfilled"
      ? {
          status: "ok",
          billsPaidCount: billsResult.value.billsPaidCount,
          billsPaidAmount: billsResult.value.billsPaidAmount,
          unpaidBills: billsResult.value.unpaidBills,
        }
      : {
          status: "error",
          error: toMessage(billsResult.reason),
        };

  const insurance: DashboardResponse["insurance"] =
    insuranceResult.status === "fulfilled"
      ? {
          status: "ok",
          insurancePoliciesCount: insuranceResult.value.insurancePoliciesCount,
          insurancePremium: insuranceResult.value.insurancePremium,
          activePolicies: insuranceResult.value.activePolicies,
        }
      : {
          status: "error",
          error: toMessage(insuranceResult.reason),
        };

  const response: DashboardResponse = {
    remittance,
    savings,
    bills,
    insurance,
    meta: {
      cachedAt: new Date().toISOString(),
      ttlSeconds: TTL_MS / 1000,
      fromCache: false,
    },
  };

  setCache(userAddress, response);
  return response;
}

// ─── Utility ───────────────────────────────────────────────────────────────

function toMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return String(reason ?? "Unknown error");
}