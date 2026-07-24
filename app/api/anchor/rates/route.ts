/**
 * @file app/api/anchor/rates/route.ts
 * @description Next.js route handler for anchor exchange rates with
 * stale-while-revalidate (SWR) semantics and a typed error path.
 *
 * ## Behaviour
 * 1. **Cache fresh** — return cached rates immediately (`stale: false`).
 * 2. **Cache expired, upstream OK** — fetch new rates, cache them, return (`stale: false`).
 * 3. **Cache expired, upstream FAIL, stale data present** — return last-good
 *    rates with `stale: true` so callers can warn users without breaking the UI.
 * 4. **Cache empty, upstream FAIL** — return a typed 503 error body.
 *
 * > **Why SWR matters:** transient anchor outages should not break the rates
 * > UI when slightly old rates are perfectly usable for display purposes.
 */

import { NextResponse } from 'next/server';
import type { ExchangeRate } from '@/lib/anchor/client';
import { anchorClient } from '@/lib/anchor/client';
import {
    getAnchorRatesCache,
    setAnchorRatesCache,
    isCacheFresh,
    isCacheStale,
} from '@/lib/anchor/rates-cache';

export const dynamic = 'force-dynamic';

/** Successful response body returned when rates are available. */
export interface RatesSuccessBody {
    /** The exchange rates returned by the anchor API (may be from cache). */
    rates: ExchangeRate[];
    /**
     * `true` when the data was served from a stale cache because the upstream
     * fetch failed. Callers should surface a soft warning to the user.
     */
    stale: boolean;
}

/** Error response body returned when no rates are available at all. */
export interface RatesErrorBody {
    /** Human-readable error description. */
    error: string;
    /** Machine-readable error code for programmatic handling. */
    code: 'UPSTREAM_UNAVAILABLE';
}

/**
 * GET /api/anchor/rates
 *
 * Returns anchor exchange rates using stale-while-revalidate semantics.
 * Responds with {@link RatesSuccessBody} on success or {@link RatesErrorBody}
 * (HTTP 503) when no cached data is available and the upstream is unreachable.
 */
export async function GET(): Promise<NextResponse<RatesSuccessBody | RatesErrorBody>> {
    // Branch 1: cache is fresh — serve immediately without a network call.
    if (isCacheFresh()) {
        const rateCache = getAnchorRatesCache();
        return NextResponse.json<RatesSuccessBody>({
            rates: rateCache.rates as ExchangeRate[],
            stale: false,
        });
    }

    // Branch 2: cache is expired — attempt revalidation from upstream.
    try {
        const fetchedRates = await anchorClient.getExchangeRates();
        setAnchorRatesCache(fetchedRates, Date.now());

        return NextResponse.json<RatesSuccessBody>({
            rates: fetchedRates,
            stale: false,
        });
    } catch (error) {
        console.error('API /anchor/rates - Error fetching from Anchor Client:', error);

        // Branch 3: upstream failed but we have stale data — serve it with a flag.
        if (isCacheStale()) {
            const rateCache = getAnchorRatesCache();
            console.warn('API /anchor/rates - Returning stale rate cache due to anchor failure.');
            return NextResponse.json<RatesSuccessBody>({
                rates: rateCache.rates as ExchangeRate[],
                stale: true,
            });
        }

        // Branch 4: no cached data at all — surface a typed error.
        return NextResponse.json<RatesErrorBody>(
            { error: 'Service Unavailable', code: 'UPSTREAM_UNAVAILABLE' },
            { status: 503 },
        );
    }
}
