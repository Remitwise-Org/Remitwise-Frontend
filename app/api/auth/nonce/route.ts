import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { setNonce } from '@/lib/auth-cache';
import { withApiLogger } from '@/lib/api-logger-middleware';

export const GET = withApiLogger(async (request) => {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Address is required' }, { status: 400 });
        }

        // Generate a secure random 32-byte nonce and convert to hex
        const nonce = crypto.randomBytes(32).toString('hex');

        // Store in our temporary cache
        setNonce(address, nonce);

        return NextResponse.json({ nonce });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
