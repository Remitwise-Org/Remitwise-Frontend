import { NextRequest, NextResponse } from 'next/server';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { getAndClearNonce } from '@/lib/auth-cache';
import { createSession, getSessionCookieHeader } from '@/lib/session';
import { prisma } from '@/lib/prisma';

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

    // Verify nonce exists and matches (atomic read + delete)
    const storedNonce = getAndClearNonce(address);
    if (!storedNonce || storedNonce !== message) {
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 401 }
      );
    }

    // Verify signature
    // The client signs Buffer.from(nonce, 'utf8') so we must decode the same way
    const keypair = Keypair.fromPublicKey(address);
    const messageBuffer = Buffer.from(message, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'base64');

    const isValid = keypair.verify(messageBuffer, signatureBuffer);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Check if user exists and is deactivated
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { stellar_address: address },
        select: { deletedAt: true },
      });
      
      // Prevent login for deactivated users
      if (user?.deletedAt) {
        return NextResponse.json(
          { error: 'USER_DEACTIVATED', message: 'Account has been deactivated' },
          { status: 410 }
        );
      }
      
      // Upsert user in database (best-effort — don't fail login if DB is unavailable)
      await prisma.user.upsert({
        where: { stellar_address: address },
        update: {},
        create: {
          stellar_address: address,
          preferences: {
            create: {},
          },
        },
      });
    } catch (dbErr) {
      console.warn('DB upsert skipped (non-fatal):', dbErr);
    }

    // Create encrypted session
    const sealed = await createSession(address);

    const response = NextResponse.json({
      success: true,
      address,
    });

    response.headers.set(
      'Set-Cookie',
      getSessionCookieHeader(sealed)
    );

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}