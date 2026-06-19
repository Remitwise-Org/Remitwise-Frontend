/**
 * Anchor API client — thin wrappers over the api-server's /api/anchor/* routes.
 *
 * Uses the session-aware apiClient so that session expiry is handled uniformly.
 *
 * @example
 * ```typescript
 * import { fetchRates, initiateDeposit } from '@/lib/anchor/client';
 *
 * const rates = await fetchRates();
 * const flow  = await initiateDeposit({ asset: 'USDC', amount: 100, walletAddress: 'G...' });
 * ```
 */

import { apiClient } from "@/lib/client/apiClient";
import type { AnchorRate } from "./rates-cache";

const BASE = "/api/anchor";

// ─── Rate types ──────────────────────────────────────────────────────────────

export interface RatesResponse {
  rates: AnchorRate[];
  cached_at: number;
}

// ─── Deposit types ───────────────────────────────────────────────────────────

export interface DepositRequest {
  asset: string;
  amount: number;
  walletAddress: string;
  email?: string;
}

export interface DepositResponse {
  id: string;
  how: string;
  instructions?: Record<string, string>;
  more_info_url?: string;
  status: string;
}

// ─── Withdraw types ──────────────────────────────────────────────────────────

export interface WithdrawRequest {
  asset: string;
  amount: number;
  walletAddress: string;
  dest?: string;
  dest_extra?: string;
}

export interface WithdrawResponse {
  id: string;
  account_id: string;
  memo_type?: string;
  memo?: string;
  more_info_url?: string;
  status: string;
}

// ─── Flow status types ───────────────────────────────────────────────────────

export interface FlowStatusResponse {
  id: string;
  status: string;
  message?: string;
  more_info_url?: string;
}

// ─── Client functions ────────────────────────────────────────────────────────

/**
 * Fetch live anchor exchange rates.
 * Returns `null` if the session has expired.
 */
export async function fetchRates(): Promise<RatesResponse | null> {
  const res = await apiClient.get(`${BASE}/rates`);
  if (!res) return null;
  if (!res.ok) throw new Error(`Rates fetch failed: ${res.status}`);
  return res.json() as Promise<RatesResponse>;
}

/**
 * Initiate a deposit flow through the anchor.
 */
export async function initiateDeposit(
  req: DepositRequest,
): Promise<DepositResponse | null> {
  const res = await apiClient.post(`${BASE}/deposit`, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Deposit failed: ${res.status}`);
  }
  return res.json() as Promise<DepositResponse>;
}

/**
 * Initiate a withdrawal flow through the anchor.
 */
export async function initiateWithdraw(
  req: WithdrawRequest,
): Promise<WithdrawResponse | null> {
  const res = await apiClient.post(`${BASE}/withdraw`, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Withdraw failed: ${res.status}`);
  }
  return res.json() as Promise<WithdrawResponse>;
}

/**
 * Poll the status of an in-progress anchor flow.
 */
export async function fetchFlowStatus(
  flowId: string,
): Promise<FlowStatusResponse | null> {
  const res = await apiClient.get(`${BASE}/status/${flowId}`);
  if (!res) return null;
  if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
  return res.json() as Promise<FlowStatusResponse>;
}
