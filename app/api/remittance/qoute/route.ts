/**
 * GET /api/remittance/quote
 *
 * Query Parameters:
 * ┌─────────────┬──────────┬──────────────────────────────────────────────────────┐
 * │ Param       │ Required │ Description                                          │
 * ├─────────────┼──────────┼──────────────────────────────────────────────────────┤
 * │ amount      │ Yes      │ Amount to send (positive number, up to 2 decimals)   │
 * │ currency    │ Yes      │ Source currency ISO code (e.g. "USD")                │
 * │ toCurrency  │ Yes      │ Destination currency ISO code (e.g. "PHP")           │
 * └─────────────┴──────────┴──────────────────────────────────────────────────────┘
 *
 * Success Response Shape  { sendAmount, receiveAmount, fee, rate, expiry }:
 * ┌───────────────┬─────────┬───────────────────────────────────────────────────────┐
 * │ Field         │ Type    │ Description                                           │
 * ├───────────────┼─────────┼───────────────────────────────────────────────────────┤
 * │ sendAmount    │ number  │ Amount the sender pays (equals `amount` param)        │
 * │ receiveAmount │ number  │ Amount recipient gets after fee + exchange conversion │
 * │ fee           │ number  │ Fee charged in source currency                        │
 * │ rate          │ number  │ Exchange rate: 1 unit of `currency` → `toCurrency`   │
 * │ expiry        │ string  │ ISO-8601 datetime — quote valid until this timestamp  │
 * └───────────────┴─────────┴───────────────────────────────────────────────────────┘
 *
 * Integration Strategy:
 * If ANCHOR_API_BASE_URL is set  → call anchor's GET /quote (SEP-38 compatible)
 *
 * Caching: quotes are cached in-memory for QUOTE_TTL_SECONDS (default 60 s).
 * Cache key = `${amount}:${currency}:${toCurrency}` (lower-cased).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { validatedRoute } from "@/lib/auth/middleware";


/**
 * Coerce query-string strings into the right types.
 * `amount` arrives as a string from the URL — coerce to number first.
 */
const quoteSchema = z.object({
  amount: z.coerce
    .number()
    .gt(0, "amount must be greater than 0"),
  currency: z
    .string()
    .length(3, "currency must be a 3-letter ISO code")
    .toUpperCase(),

  toCurrency: z
    .string()
    .length(3, "toCurrency must be a 3-letter ISO code")
    .toUpperCase(),
});

type QuoteInput = z.infer<typeof quoteSchema>;
type Response = {
  sendAmount: number;
  receiveAmount: number;
  fee: number;
  rate: number;
  expiry: string;
  source: "anchor" | "stellar" ;
} 

type QuoteResponse = Response | {message: string}

// ---------------------------------------------------------------------------
// Simple in-memory cache  (survives across requests in the same server process)
// ---------------------------------------------------------------------------

const QUOTE_TTL_MS = (Number(process.env.QUOTE_TTL_SECONDS) || 60) * 1_000;

interface CacheEntry {
  data: QuoteResponse;
  expiresAt: number; // epoch ms
}

const quoteCache = new Map<string, CacheEntry>();

function getCached(key: string): QuoteResponse | null {
  const entry = quoteCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    quoteCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: QuoteResponse): void {
  quoteCache.set(key, { data, expiresAt: Date.now() + QUOTE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Integration helpers
// ---------------------------------------------------------------------------

/** Call an SEP-38-compatible anchor /quote endpoint. */
async function fetchAnchorQuote(input: QuoteInput): Promise<QuoteResponse> {
  const base = process.env.ANCHOR_API_BASE_URL!.replace(/\/$/, "");
  const url = new URL(`${base}/quote`);
  url.searchParams.set("sell_asset", `iso4217:${input.currency}`);
  url.searchParams.set("sell_amount", String(input.amount));
  url.searchParams.set("buy_asset", `iso4217:${input.toCurrency}`);
  url.searchParams.set("type", `firm`); // type can be indicative or firm, see https://developers.stellar.org/docs/platforms/anchor-platform/api-reference/callbacks/get-rates

  const res = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" },
    // next.js fetch — don't cache at the fetch layer; we cache ourselves
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anchor quote failed (${res.status}): ${body}`);
  }

  /**
   * SEP-38 response shape (simplified):
   * { id, expires_at, price, sell_asset, sell_amount, buy_asset, buy_amount, fee: { total, asset } }
   */
  const json = await res.json();

  const rate = Number(json.price); // buy units per 1 sell unit
  const fee = Number(json.fee?.total ?? 0);
  const sendAmount = Number(json.sell_amount ?? input.amount);
  const receiveAmount = Number(json.buy_amount ?? (sendAmount - fee) * rate);

  return {
    sendAmount,
    receiveAmount: round2(receiveAmount),
    fee: round2(fee),
    rate,
    expiry: json.expires_at ?? ttlIso(),
    source: "anchor",
  };
}




async function resolveQuote(input: QuoteInput): Promise<QuoteResponse> {
  if (process.env.ANCHOR_API_BASE_URL) {
    return fetchAnchorQuote(input);
  }

  return {message: "Unable to resolve quote"}
}



export const GET = validatedRoute(
  quoteSchema,
  "query",
  async (req, data: QuoteInput) => {
    const cacheKey = `${data.amount}:${data.currency}:${data.toCurrency}`.toLowerCase();

    // Return cached quote if still fresh
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT", "Cache-Control": `max-age=${QUOTE_TTL_MS / 1000}` },
      });
    }

    try {
      const quote = await resolveQuote(data);
      setCache(cacheKey, quote);

      return NextResponse.json(quote, {
        headers: { "X-Cache": "MISS", "Cache-Control": `max-age=${QUOTE_TTL_MS / 1000}` },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch quote";
      console.error("[quote] upstream error:", err);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }
);


function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Returns an ISO-8601 string QUOTE_TTL_MS from now. */
function ttlIso(): string {
  return new Date(Date.now() + QUOTE_TTL_MS).toISOString();
}