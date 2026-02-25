import crypto from 'crypto';

export type WebhookSignatureAlgorithm = 'hmac-sha256' | 'stripe-v1' | 'ed25519';

function toBuffer(payload: string | Buffer): Buffer {
  return typeof payload === 'string' ? Buffer.from(payload) : payload;
}

function stripKnownPrefixes(signature: string): string {
  const trimmed = signature.trim();
  const prefixes = ['sha256=', 'v1='];
  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return trimmed;
}

function decodeSignature(signature: string): Buffer | null {
  const normalized = stripKnownPrefixes(signature);
  if (!normalized) return null;

  if (/^[0-9a-f]+$/i.test(normalized) && normalized.length % 2 === 0) {
    return Buffer.from(normalized, 'hex');
  }

  try {
    return Buffer.from(normalized, 'base64');
  } catch {
    return null;
  }
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyHmacSha256(payload: Buffer, signature: string, secret: string): boolean {
  const provided = decodeSignature(signature);
  if (!provided) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest();

  return safeEqual(provided, expected);
}

function parseStripeSignature(signature: string): { timestamp: string; signatures: string[] } | null {
  const parts = signature.split(',').map(part => part.trim());
  let timestamp = '';
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!key || !value) continue;
    if (key === 't') {
      timestamp = value;
    }
    if (key === 'v1') {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) return null;

  return { timestamp, signatures };
}

function verifyStripeV1(payload: Buffer, signature: string, secret: string): boolean {
  const parsed = parseStripeSignature(signature);
  if (!parsed) return false;

  const signedPayload = `${parsed.timestamp}.${payload.toString()}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest();

  return parsed.signatures.some(sig => {
    if (!/^[0-9a-f]+$/i.test(sig) || sig.length % 2 !== 0) {
      return false;
    }
    const provided = Buffer.from(sig, 'hex');
    return safeEqual(provided, expected);
  });
}

function verifyEd25519(payload: Buffer, signature: string, secret: string): boolean {
  const provided = decodeSignature(signature);
  if (!provided) return false;

  try {
    const publicKey = crypto.createPublicKey(secret);
    return crypto.verify(null, payload, publicKey, provided);
  } catch {
    return false;
  }
}

/**
 * Verify webhook signature with a shared secret.
 *
 * Supported algorithms:
 * - "hmac-sha256" (default): HMAC SHA-256 of the raw payload.
 * - "stripe-v1": Stripe-style header "t=timestamp,v1=signature".
 * - "ed25519": Ed25519 verification with a PEM-encoded public key.
 */
export function verifySignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: WebhookSignatureAlgorithm = 'hmac-sha256'
): boolean {
  if (!payload || !signature || !secret) return false;

  const body = toBuffer(payload);

  switch (algorithm) {
    case 'hmac-sha256':
      return verifyHmacSha256(body, signature, secret);
    case 'stripe-v1':
      return verifyStripeV1(body, signature, secret);
    case 'ed25519':
      return verifyEd25519(body, signature, secret);
    default:
      return false;
  }
}
