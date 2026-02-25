# Anchor Webhook Integration

This document outlines how external Anchors or payment providers can send asynchronous transaction updates (like deposit/withdrawal statuses) to the Remitwise platform.

## Endpoint Details
- **URL**: `https://<your-domain>/api/webhooks/anchor`
- **Method**: `POST`
- **Content-Type**: `application/json`

## Security & Authentication
Webhooks are unauthenticated but cryptographically verified. The Anchor must sign the **raw JSON body** using HMAC SHA-256 and a shared secret. The resulting hex string must be passed in the headers.

Signature verification is handled by `lib/webhooks/verify.ts`. See `docs/api/webhooks.md` for common providers and header/secret conventions.

**Required Environment Variable:**
\`\`\`env
ANCHOR_WEBHOOK_SECRET="your_shared_secret_here"
\`\`\`

**Required Header:**
`x-anchor-signature`: `<hmac-sha256-hex>`

## Expected Payload Shape
The webhook expects a JSON payload containing at minimum the `event_type`, `transaction_id`, and `status`.

\`\`\`json
{
  "event_type": "deposit_completed",
  "transaction_id": "tx_123abc456def",
  "status": "completed",
  "amount": "100.00",
  "asset": "USDC",
  "timestamp": "2026-02-24T21:13:00Z"
}
\`\`\`

### Supported Event Types
1. **`deposit_completed`**: Fired when an anchor successfully processes a user's fiat deposit and issues on-chain assets.
2. **`withdrawal_failed`**: Fired when an on-chain withdrawal to fiat fails at the anchor level.
