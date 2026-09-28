import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { setNonce } from '@/lib/auth-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STELLAR_ADDRESS_REGEX = /^G[A-Z0-9]{55}$/;

function isValidStellarAddress(address: string): boolean {
  return STELLAR_ADDRESS_REGEX.test(address);
}

/**
 * Extracts address from query params or request body
 */
export async function resolveAddressFromRequest(request: NextRequest): Promise<string | null> {
  const queryAddress = request.nextUrl.searchParams.get('address')?.trim();
  if (queryAddress) return queryAddress;

  if (request.method === 'POST') {
    try {
      const body = await request.clone().json();
      const address = (body.publicKey || body.address);
      if (typeof address === 'string') return address.trim();
    } catch {
      // Ignore body parsing errors
    }
  }

  return null;
}

async function handleNonceRequest(request: NextRequest) {
  try {
    const address = await resolveAddressFromRequest(request);

    if (!address || !isValidStellarAddress(address)) {
      return NextResponse.json(
        { error: 'Valid Stellar address is required (e.g., ?address=G...)' },
        { status: 400 }
      );
    }

    const nonce = randomBytes(32).toString('hex');

    setNonce(address, nonce);

    return NextResponse.json({
      nonce,
      address,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleNonceRequest(request);
}

export async function POST(request: NextRequest) {
  return handleNonceRequest(request);
}
