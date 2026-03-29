# Webhook Retry and Dead-Letter Queue Implementation

## Overview

This document describes the webhook retry and dead-letter queue (DLQ) system implemented in Remitwise. This system ensures that no webhook event is lost, even if processing fails temporarily.

### Key Features

- **Event Persistence**: All incoming webhooks are persisted to the database before processing
- **Automatic Retry**: Failed events are automatically retried with exponential backoff
- **Dead-Letter Queue**: Events that exceed max retries are moved to a DLQ for manual review
- **Admin Interface**: Protected endpoints allow administrators to monitor and replay DLQ events
- **Graceful Processing**: Events are processed in the background without blocking the webhook receipt

## Architecture

### Webhook Receipt Flow

```
Webhook Received
    ↓
Signature Verification
    ↓
Save to Database (status: pending)
    ↓
Return 200 OK immediately
    ↓
(Background) Process Event
    ↓
Success → Update status to "processed"
   OR
Failure → Schedule retry or move to DLQ
```

### Event Lifecycle

Each webhook event progresses through these statuses:

1. **pending** - Newly received, waiting to be processed for the first time
2. **processing** - Currently being processed
3. **processed** - Successfully processed (terminal state)
4. **failed** - Processing failed, waiting to retry (temporary state)
5. **dlq** - Exceeded max retries, moved to dead-letter queue (terminal state)

## Retry Policy

### Configuration

The retry policy is configured via environment variables:

```env
# Maximum number of retries before moving to DLQ (default: 5)
WEBHOOK_MAX_RETRIES=5

# Initial delay before first retry in milliseconds (default: 1000ms)
WEBHOOK_INITIAL_DELAY_MS=1000

# Exponential backoff multiplier (default: 2)
WEBHOOK_BACKOFF_MULTIPLIER=2

# Maximum delay between retries in milliseconds (default: 60000ms)
WEBHOOK_MAX_DELAY_MS=60000

# Interval for background processing loop in milliseconds (default: 30000ms)
WEBHOOK_PROCESSING_INTERVAL_MS=30000
```

### Backoff Strategy

Failed events are retried with **exponential backoff and jitter**:

- Attempt 1: Attempt immediately
- Attempt 2: ~1 second delay (initial + jitter)
- Attempt 3: ~2 seconds delay (initial × 2 + jitter)
- Attempt 4: ~4 seconds delay (initial × 4 + jitter)
- Attempt 5: ~8 seconds delay (initial × 8 + jitter)
- Attempt 6: ~16 seconds delay, but capped at 60 seconds max
- After Attempt 6 (max retries exceeded): Move to DLQ

**Jitter**: Each delay includes random variation of 0-20% to prevent thundering herd

Example with defaults:
- Max 5 retries
- Total potential delay: ~1 + 2 + 4 + 8 + 16 = ~31 seconds
- Maximum event age in failed state: ~1 minute plus max delay = ~1:31

## Dead-Letter Queue (DLQ)

The DLQ is a holding area for webhook events that couldn't be processed after all retries. Events in the DLQ:

- Are not automatically retried
- Must be manually reviewed and replayed
- Are tracked in audit logs for compliance

### Example DLQ Event

```json
{
  "id": "evt_123abc",
  "source": "anchor",
  "eventType": "deposit_completed",
  "status": "dlq",
  "retryCount": 5,
  "maxRetries": 5,
  "lastError": "Connection timeout after 30s",
  "createdAt": "2026-03-29T10:15:00Z",
  "updatedAt": "2026-03-29T10:16:31Z",
  "rawPayload": "{...}"
}
```

### Common DLQ Reasons

- **Processing timeout**: External service (e.g., database) became unavailable
- **Invalid state**: Transaction ID doesn't exist in the system
- **Rate limiting**: Processing exceeded rate limits on downstream services
- **Configuration error**: Required environment variables not set
- **Unexpected payload format**: Webhook format changed unexpectedly

## Admin Endpoints

### Environment Setup

To use admin endpoints, set the admin secret:

```env
ADMIN_SECRET="your-secret-key-here"
```

All admin requests must include the secret via:
- Header: `x-admin-key: <secret>`
- Cookie: `admin_key=<secret>` or `admin_secret=<secret>`

### List DLQ Events

**Endpoint**: `GET /api/v1/admin/webhooks/dlq`

**Query Parameters**:
- `limit` - Items per page (1-100, default: 50)
- `offset` - Pagination offset (default: 0)
- `source` - Filter by webhook source (e.g., "anchor")

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/admin/webhooks/dlq?limit=20&offset=0&source=anchor" \
  -H "x-admin-key: your-secret-key"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "evt_123",
        "source": "anchor",
        "eventType": "deposit_completed",
        "status": "dlq",
        "retryCount": 5,
        "maxRetries": 5,
        "lastError": "Database connection failed",
        "createdAt": "2026-03-29T10:15:00Z",
        "updatedAt": "2026-03-29T10:16:31Z",
        "rawPayload": "{...}"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 42,
      "hasMore": true
    },
    "stats": {
      "pending": 5,
      "processing": 0,
      "processed": 1250,
      "failed": 3,
      "dlq": 42,
      "total": 1300
    }
  }
}
```

### Replay DLQ Event

**Endpoint**: `POST /api/v1/admin/webhooks/dlq/{id}/replay`

**Path Parameters**:
- `id` - The webhook event ID

Replays a DLQ event by resetting it to pending status. The event will be processed again on the next background processing cycle.

**Example Request**:
```bash
curl -X POST "http://localhost:3000/api/v1/admin/webhooks/dlq/evt_123/replay" \
  -H "x-admin-key: your-secret-key"
```

**Response**:
```json
{
  "success": true,
  "message": "Event evt_123 has been replayed and moved to pending queue"
}
```

### Manually Trigger Webhook Processing

**Endpoint**: `POST /api/v1/admin/webhooks/process`

**Query Parameters**:
- `limit` - Max events to process in this call (1-500, default: 100)

Triggers an immediate processing cycle for pending webhook events. Useful for:
- Manual testing
- Recovery from temporary outages
- Integration with external cron jobs

**Example Request**:
```bash
curl -X POST "http://localhost:3000/api/v1/admin/webhooks/process?limit=50" \
  -H "x-admin-key: your-secret-key"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "processed": 45,
    "failed": 5,
    "error": null,
    "message": "Processed 45 webhooks (5 failed)"
  }
}
```

## Monitoring and Troubleshooting

### Database Schema

Webhook events are stored in the `WebhookEvent` table:

```prisma
model WebhookEvent {
  id          String    @id @default(cuid())     // Unique event ID
  source      String                              // e.g. "anchor"
  eventType   String                              // e.g. "deposit_completed"
  rawPayload  String                              // Raw JSON body
  status      String    @default("pending")       // pending|processing|processed|failed|dlq
  retryCount  Int       @default(0)               // Current retry attempt
  maxRetries  Int       @default(5)               // Max retries allowed
  lastError   String?                             // Last error message
  nextRetryAt DateTime?                           // When to attempt next retry
  createdAt   DateTime  @default(now())           // Event received time
  updatedAt   DateTime  @updatedAt                // Last status change
  processedAt DateTime?                           // When successfully processed

  @@index([status])
  @@index([source])
  @@index([nextRetryAt])
}
```

### Useful Queries

Check pending events:
```sql
SELECT id, source, eventType, retryCount, nextRetryAt 
FROM WebhookEvent 
WHERE status = 'pending' OR (status = 'failed' AND nextRetryAt <= NOW());
```

Check DLQ events:
```sql
SELECT id, source, eventType, retryCount, lastError, createdAt 
FROM WebhookEvent 
WHERE status = 'dlq'
ORDER BY createdAt DESC;
```

Get event statistics:
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(retryCount) as avg_retries
FROM WebhookEvent
WHERE createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY status;
```

### Monitoring Best Practices

1. **Set up alerts** for:
   - DLQ events accumulating (threshold: >10 events)
   - Failed events exceeding maximum retries frequently
   - High retry counts for specific event types

2. **Regular DLQ reviews**:
   - Check DLQ daily for new events
   - Identify patterns in failures
   - Replay events once underlying issues are fixed

3. **Logging**:
   - All webhook processing is logged with `[WebhookProcessor]` prefix
   - DLQ events are recordedas audit events (`webhook.dlq` type)
   - Replay actions are tracked (`webhook.dlq.replay` type)

## Implementation Details

### Key Components

1. **lib/webhooks/processor.ts**
   - Core retry logic and event persistence
   - Functions: `saveWebhookEvent()`, `processWebhookEvent()`, `getDLQEvents()`, `replayDLQEvent()`

2. **lib/webhooks/retry.ts**
   - Handler registration and background processing loop
   - Functions: `registerWebhookHandler()`, `processPendingWebhooks()`, `startWebhookProcessingLoop()`

3. **lib/webhooks/init.ts**
   - Application initialization of webhook handlers
   - Should be called once on app startup

4. **app/api/webhooks/anchor/route.ts**
   - Webhook receipt endpoint
   - Persists events and triggers async processing

5. **app/api/v1/admin/webhooks/dlq/route.ts**
   - Admin endpoint to list DLQ events and statistics

6. **app/api/v1/admin/webhooks/dlq/[id]/replay/route.ts**
   - Admin endpoint to replay DLQ events

7. **app/api/v1/admin/webhooks/process/route.ts**
   - Manual trigger for webhook processing cycle

### Adding New Webhook Sources

To add support for a new webhook source (e.g., Stripe, PayPal):

1. Create a webhook receipt endpoint:
```typescript
// app/api/webhooks/stripe/route.ts
import { saveWebhookEvent, processWebhookEvent } from '@/lib/webhooks/processor';

export async function POST(request: Request) {
  // 1. Verify signature
  // 2. Save to database
  const eventId = await saveWebhookEvent('stripe', eventType, rawBody);
  
  // 3. Process asynchronously
  runBackgroundJob('stripe_webhook_event', async () => {
    await processWebhookEvent(eventId, handleStripeEvent);
  });

  return NextResponse.json({ received: true }, { status: 200 });
}

// Handler function
async function handleStripeEvent(payload: Record<string, any>) {
  // ... process event
  return { success: true };
}
```

2. The event will automatically be picked up by the background processing loop and retried if it fails.

## Security Considerations

### Signature Verification

All webhook endpoints must verify signatures:
- Use HMAC-SHA256 or provider-specific signature scheme
- Verify against raw request body (not parsed JSON)
- Use `crypto.timingSafeEqual()` to prevent timing attacks
- Reject unsigned or invalid signatures before saving

### Admin Access Control

Admin endpoints require the `ADMIN_SECRET`:
- Never expose in client-side code
- Rotate periodically
- Store in secure secret management (not in version control)
- Log all admin actions in audit logs

### Event Data Privacy

- Raw webhook payloads are stored in database
- May contain sensitive information (PII, tokens)
- Ensure database access is restricted
- Consider encrypting sensitive fields
- Implement data retention policies

## Migration Guide

If migrating from a webhook system without retries:

1. **Add the WebhookEvent model to your schema** (already included in `prisma/schema.prisma`)

2. **Run database migration**:
```bash
npx prisma migrate dev --name add-webhook-events
```

3. **Update webhook endpoints** to use the new processor:
```typescript
// Old: Direct processing
handleWebhookEvent(payload);

// New: Persistent processing with retries
const eventId = await saveWebhookEvent('source', eventType, rawBody);
runBackgroundJob('webhook', async () => {
  await processWebhookEvent(eventId, handleWebhookEvent);
});
```

4. **Initialize handlers** on app startup (if using handler registration):
```typescript
// In app initialization (e.g., layout.tsx or middleware.ts)
import { initializeWebhookHandlers } from '@/lib/webhooks/init';

if (typeof window === 'undefined') { // Server-side only
  initializeWebhookHandlers();
}
```

5. **Configure environment variables**:
```bash
WEBHOOK_MAX_RETRIES=5
WEBHOOK_INITIAL_DELAY_MS=1000
WEBHOOK_BACKOFF_MULTIPLIER=2
WEBHOOK_MAX_DELAY_MS=60000
WEBHOOK_PROCESSING_INTERVAL_MS=30000
ADMIN_SECRET="choose-a-strong-secret"
```

6. **Test the system**:
   - Send test webhook
   - Verify it's saved in database
   - Check it's processed successfully
   - Test retry by making handler fail
   - Verify event retries and eventually moves to DLQ

## Compliance and Auditing

### Audit Trail

All webhook events are tracked in the audit log:
- Receipt: Event saved with metadata
- Processing: Success or failure recorded
- DLQ: Event moved to DLQ with error reason
- Replay: Admin replay action recorded

Example audit event:
```json
{
  "type": "webhook.dlq",
  "actor": "webhook-processor",
  "message": "Webhook event moved to DLQ after 5 retries: anchor/deposit_completed",
  "metadata": {
    "eventId": "evt_123",
    "source": "anchor",
    "eventType": "deposit_completed",
    "lastError": "Database connection failed"
  },
  "timestamp": "2026-03-29T10:16:31Z"
}
```

### Retention Policy

- **Processed events**: Keep indefinitely for audit trail
- **DLQ events**: Keep for minimum of 30 days
- **Failed events**: Can be cleaned up after successful next attempt
- Implement retention cleanup jobs as needed

### Acceptance Criteria

✅ Retry and DLQ implemented
- Events are persisted on receipt
- Automatic retry with exponential backoff
- Max retries limit with DLQ move

✅ Admin endpoint optional
- GET /api/v1/admin/webhooks/dlq - List DLQ events
- POST /api/v1/admin/webhooks/dlq/{id}/replay - Replay events
- POST /api/v1/admin/webhooks/process - Manual trigger processing

✅ Documented
- Complete architecture overview
- Configuration guide
- Admin endpoint documentation
- Troubleshooting guide
