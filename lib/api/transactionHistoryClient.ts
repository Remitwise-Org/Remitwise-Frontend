import { apiClient } from "@/lib/client/apiClient";
import type { TransactionItem } from "@/lib/remittance/horizon";

export interface TransactionHistoryPage {
  transactions: TransactionItem[];
  nextCursor?: string;
  userAddress?: string;
}

export interface GetTransactionHistoryOptions {
  limit?: number;
  cursor?: string;
  status?: "completed" | "failed" | "pending";
}

/** Typed client for `GET /api/v1/remittance/history`, replacing the ad-hoc
 * `fetch` + manually-built `URLSearchParams` + untyped `response.json()`
 * previously inlined in the transaction-history page. Goes through
 * `apiClient.getJson` so it gets the shared timeout/retry/session-expiry
 * handling every other typed read in the app already has. */
export async function getTransactionHistory(
  options: GetTransactionHistoryOptions = {}
): Promise<TransactionHistoryPage> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 50));
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.status) params.set("status", options.status);

  const body = await apiClient.getJson<TransactionHistoryPage>(
    `/api/v1/remittance/history?${params}`
  );

  // `getJson` returns null only when the session-expiry flow already
  // redirected the user away -- an empty page is the right thing to
  // render for the instant before that navigation completes.
  return body ?? { transactions: [] };
}
