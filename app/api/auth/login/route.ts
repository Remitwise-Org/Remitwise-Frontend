import { NextRequest, NextResponse } from 'next/server';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { consumeNonce } from '@/lib/auth/nonces';
import { createSession, getSessionCookieHeader } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { verifyWalletSignature } from '@/lib/auth/verify-signature';
import { getSessionCookieHeader } from '@/lib/session';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/login
 * Verify a signature and authenticate user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, message, signature } = body;

    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: address, message, signature' },
        { status: 400 }
      );
    }

    // Validate Stellar address format
    if (!StrKey.isValidEd25519PublicKey(address)) {
      return NextResponse.json(
        { error: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    // Verify nonce exists and matches (atomic read + delete via Prisma transaction)
    const nonceValid = await consumeNonce(address, message);
    if (!nonceValid) {
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 401 }
      );
    }
    const result = await verifyWalletSignature({ address, message, signature });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const response = NextResponse.json({
      success: true,
      address: result.address,
      expiresAt: result.expiresAt,
    });

    if (result.sealedSession) {
      response.headers.set(
        'Set-Cookie',
        getSessionCookieHeader(result.sealedSession)
      );
    }

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
