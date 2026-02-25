# Webhook Signature Verification

This project centralizes webhook signature verification in `lib/webhooks/verify.ts`.

## Helper

```
verifySignature(payload: string | Buffer, signature: string, secret: string, algorithm?: string): boolean
```

Supported algorithms:
- `hmac-sha256` (default): HMAC SHA-256 of the raw payload.
- `stripe-v1`: Stripe-style header values (`t=timestamp,v1=signature`).
- `ed25519`: Ed25519 verification using a PEM-encoded public key.

## Providers

Anchor
- Header: `x-anchor-signature`
- Env var: `ANCHOR_WEBHOOK_SECRET`
- Algorithm: `hmac-sha256`
- Signature format: hex digest of HMAC-SHA256 over the raw request body.

Stripe
- Header: `stripe-signature`
- Env var: `STRIPE_WEBHOOK_SECRET`
- Algorithm: `stripe-v1`
- Signature format: `t=timestamp,v1=hex_signature` where the payload is `${timestamp}.${rawBody}`.

Ed25519 (generic)
- Header: `x-signature`
- Env var: `WEBHOOK_PUBLIC_KEY`
- Algorithm: `ed25519`
- Signature format: base64 or hex signature; secret must be a PEM public key.

## Usage

```
import { verifySignature } from '@/lib/webhooks/verify'

const rawBody = await request.text()
const signature = request.headers.get('x-anchor-signature')
const secret = process.env.ANCHOR_WEBHOOK_SECRET

if (!signature || !secret || !verifySignature(rawBody, signature, secret, 'hmac-sha256')) {
  return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
}
```
