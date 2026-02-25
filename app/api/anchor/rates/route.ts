import { NextResponse } from 'next/server';
import { anchorClient, ExchangeRate } from '@/lib/anchor/client';

export const dynamic = 'force-dynamic';

interface CacheData {
    rates: ExchangeRate[] | null;
    timestamp: number;
}

// In-memory cache variables for rates.
// Next.js development server may drop this cache on hot-reload, but it will work effectively in a production environment (serverless instance lifetime).
let rateCache: CacheData = {
    rates: null,
    timestamp: 0,
};

// 5 minutes in milliseconds
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
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
        rateCache = {
            rates: fetchedRates,
            timestamp: now,
        };

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
