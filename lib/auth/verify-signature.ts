import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { getAndClearNonce } from '@/lib/auth-cache';
import { createSession, getSessionCookieHeader } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export interface VerifySignatureParams {
  address: string;
  message: string;
  signature: string;
}

export interface VerifySignatureResult {
  success: boolean;
  status: number;
  error?: string;
  address?: string;
  expiresAt?: number;
  sealedSession?: string;
}

/**
 * Shared routine to validate address, consume nonce, verify signature, upsert user, and create session.
 */
export async function verifyWalletSignature({
  address,
  message,
  signature,
}: VerifySignatureParams): Promise<VerifySignatureResult> {
  if (!address || !message || !signature) {
    return {
      success: false,
      status: 400,
      error: 'Missing required fields',
    };
  }

  // Validate Stellar address format
  if (!StrKey.isValidEd25519PublicKey(address)) {
    return {
      success: false,
      status: 400,
      error: 'Invalid Stellar address format',
    };
  }

  // Verify nonce exists and matches (atomic read + delete)
  const storedNonce = getAndClearNonce(address);
  if (!storedNonce || storedNonce !== message) {
    return {
      success: false,
      status: 401,
      error: 'Invalid or expired nonce',
    };
  }

  // Verify signature
  let isValid = false;
  try {
    const keypair = Keypair.fromPublicKey(address);
    const messageBuffer = Buffer.from(message, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'base64');

    isValid = keypair.verify(messageBuffer, signatureBuffer);
  } catch (verifyError) {
    console.error('Signature verification technical error:', verifyError);
    return {
      success: false,
      status: 400,
      error: 'Malformed signature or address',
    };
  }

  if (!isValid) {
    return {
      success: false,
      status: 401,
      error: 'Invalid signature',
    };
  }

  // Upsert user in database (best-effort)
  try {
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
  const { sealed, session } = await createSession(address);

  return {
    success: true,
    status: 200,
    address,
    expiresAt: session.expiresAt,
    sealedSession: sealed,
  };
}
