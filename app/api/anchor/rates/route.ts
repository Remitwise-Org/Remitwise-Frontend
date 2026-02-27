import { NextResponse } from 'next/server';
import { anchorClient } from '@/lib/anchor/client';
import { getAnchorRatesCache, setAnchorRatesCache } from '@/lib/anchor/rates-cache';

export const dynamic = 'force-dynamic';

// 5 minutes in milliseconds
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
    const rateCache = getAnchorRatesCache();
    const now = Date.now();
    const isCacheValid = rateCache.rates !== null && (now - rateCache.timestamp) < CACHE_TTL;

    if (isCacheValid) {
        return NextResponse.json({
            rates: rateCache.rates,
            stale: false,
        });
    }

    try {
        const fetchedRates = await anchorClient.getExchangeRates();

        // Update the cache
        setAnchorRatesCache(fetchedRates, now);

        return NextResponse.json({
            rates: fetchedRates,
            stale: false,
        });
    } catch (error) {
        console.error('API /anchor/rates - Error fetching from Anchor Client:', error);

        // Fallback: If cache exists but is stale, return the stale cache.
        if (rateCache.rates !== null) {
            console.warn('API /anchor/rates - Returning stale rate cache due to anchor failure.');
            return NextResponse.json({
                rates: rateCache.rates,
                stale: true,
            });
        }

        // No cache exists and the fetch failed
        return NextResponse.json(
            { error: 'Service Unavailable' },
            { status: 503 }
        );
    }
}
