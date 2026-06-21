import { NextResponse } from 'next/server';
import { anchorClient } from '@/lib/anchor/client';
import {
    getAnchorRatesCache,
    setAnchorRatesCache,
    isCacheFresh,
    isCacheStale,
} from '@/lib/anchor/rates-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (isCacheFresh()) {
        const rateCache = getAnchorRatesCache();
        return NextResponse.json({
            rates: rateCache.rates,
            stale: false,
        });
    }

    try {
        const fetchedRates = await anchorClient.getExchangeRates();
        setAnchorRatesCache(fetchedRates, Date.now());

        return NextResponse.json({
            rates: fetchedRates,
            stale: false,
        });
    } catch (error) {
        console.error('API /anchor/rates - Error fetching from Anchor Client:', error);

        if (isCacheStale()) {
            const rateCache = getAnchorRatesCache();
            console.warn('API /anchor/rates - Returning stale rate cache due to anchor failure.');
            return NextResponse.json({
                rates: rateCache.rates,
                stale: true,
            });
        }

        return NextResponse.json(
            { error: 'Service Unavailable' },
            { status: 503 }
        );
    }
}
