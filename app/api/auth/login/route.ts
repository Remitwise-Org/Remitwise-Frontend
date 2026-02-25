import { NextResponse } from 'next/server';
import { Keypair } from '@stellar/stellar-sdk';
import { getAndClearNonce } from '@/lib/auth-cache';
import { withApiLogger } from '@/lib/api-logger-middleware';

export const POST = withApiLogger(async (request) => {
  try {
    const body = await request.json();
    const { address, signature } = body;

    if (!address || !signature) {
      return NextResponse.json(
        { error: 'Address and signature are required' },
        { status: 400 }
      );
    }

    // Retrieve and clear nonce — returns null if missing or expired
    const nonce = getAndClearNonce(address);
    if (!nonce) {
      return NextResponse.json(
        { error: 'Nonce expired or missing. Please request a new nonce.' },
        { status: 401 }
      );
    }

    // Verify signature
    try {
      const keypair = Keypair.fromPublicKey(address);
      // Nonce is stored as hex string; signature is base64 from the client.
      const isValid = keypair.verify(
        Buffer.from(nonce, 'hex'),
        Buffer.from(signature, 'base64')
      );

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch {
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true, token: 'mock-session-token' });
    response.cookies.set('session', 'mock-session-cookie', { httpOnly: true, path: '/' });
    return response;

  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
});