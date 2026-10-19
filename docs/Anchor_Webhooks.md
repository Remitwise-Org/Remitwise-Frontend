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

## Reliability & Retry Policy

All Anchor webhooks are processed with automatic retry and dead-letter queue (DLQ) handling to ensure no event is lost:

- **Immediate 200 Response**: Webhook receipt is acknowledged immediately and asynchronously processed
- **Persistent Storage**: Events are saved to database before processing
- **Automatic Retry**: Failed events are retried up to 5 times with exponential backoff (~1s, 2s, 4s, 8s, 16s delays)
- **Dead-Letter Queue**: Events exceeding max retries are moved to DLQ for manual review

See [Webhook Retry and Dead-Letter Queue Documentation](./WEBHOOK_RETRY_AND_DLQ.md) for comprehensive details on:
- Retry configuration and backoff strategy
- Dead-letter queue monitoring and replay
- Admin endpoints for manual intervention
- Troubleshooting guide

### Example: Failed Event Recovery

If an Anchor webhook fails to process (e.g., database is temporarily unavailable):

1. Event is persisted with status `pending`
2. First retry happens ~1 second later
3. If still failing, subsequent retries with exponential backoff
4. After 5 failed retries, event is moved to DLQ
5. Administrator reviews DLQ event and manually triggers replay
6. Event is reprocessed on next background cycle
