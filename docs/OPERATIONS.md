# Operations and Support Guide

This guide is designed for **system operators, site reliability engineers (SREs), and support teams** responsible for maintaining, monitoring, and troubleshooting the RemitWise Frontend and its immediate backend integrations.

---

## 1. Automated Health & Integration Checks

The system continuously monitors critical infrastructure dependencies and logs diagnostics automatically.

### Central Health Check Endpoint (`/api/health`)
The application exposes a public health probe at `/api/health` that validates database connectivity and Soroban RPC responsiveness.

#### Probe Request
```bash
curl -i http://localhost:3000/api/health
```

#### Healthy Response (HTTP 200)
```json
{
  "status": "ok",
  "database": {
    "reachable": true
  },
  "rpc": {
    "reachable": true,
    "latestLedger": 321854,
    "protocolVersion": 20,
    "networkPassphrase": "Test SDF Network ; September 2015",
    "network": "testnet"
  },
  "anchor": {
    "reachable": true
  },
  "timestamp": "2026-07-25T01:42:00.000Z"
}
```

#### Degraded Response (HTTP 503)
If a critical dependency is offline or timing out, the endpoint returns a `503 Service Unavailable` status:
```json
{
  "status": "degraded",
  "database": {
    "reachable": false,
    "error": "Database query timeout"
  },
  "rpc": {
    "reachable": false,
    "network": "testnet",
    "error": "Unexpected error contacting Soroban RPC"
  },
  "anchor": {
    "reachable": true
  },
  "timestamp": "2026-07-25T01:42:00.000Z"
}
```

#### Client-Side Monitoring
The frontend includes a visual indicator component in the global navigation bar. It polls `/api/health` every **60 seconds** (`HEALTH_PING_INTERVAL_MS`).
- **Green Dot (`bg-green-500`)**: Healthy (`status: "ok"`).
- **Red Dot (`bg-red-500`)**: Unhealthy/Degraded (`status: "degraded"` or network error).

---

### Sentry Error Tracking & Request Correlation
Errors are automatically piped to Sentry under the `SENTRY_DSN` configuration. 
- **Request IDs**: Every client request receives a unique correlation header (`X-Request-ID`).
- **Sentry Integration**: If a page or API handler throws an unhandled exception, Sentry captures the error and attaches the `x-request-id` to the context. Use this ID to search Sentry issues or cross-reference standard JSON log outputs.

---

### Webhook Processing and Dead-Letter Queue (DLQ)
Webhook events received from external anchors are written directly to the local database and processed asynchronously in the background.

```
Incoming Webhook
  └── Verify Signature
        └── Write to DB (status: "pending")
              └── Return 200 OK (immediate acknowledgment)
                    └── Background Processing Loop
```

- **Retry Policy**: Failed webhooks are retried automatically up to **5 times** (`WEBHOOK_MAX_RETRIES`) using an exponential backoff strategy with random jitter (0-20%).
- **Jitter Formula**: `delay = baseDelay * (2 ^ attempt) * (1 + randomJitter)`
- **DLQ State**: When all retries are exhausted, the event status transitions to `dlq`.

---

## 2. Manual Verification Checks & Operational Tasks

When automated checks flag a degraded status, operators can perform the following manual checks.

### Inspecting Webhook DLQ Events
To inspect events stuck in the Dead-Letter Queue:
```bash
curl -X GET "http://localhost:3000/api/v1/admin/webhooks/dlq?limit=10" \
  -H "x-admin-key: your-configured-admin-secret"
```

#### Sample Response Payload
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
        "createdAt": "2026-07-25T00:15:00.000Z",
        "updatedAt": "2026-07-25T00:16:31.000Z",
        "rawPayload": "{\"id\":\"evt_123\",\"type\":\"deposit_completed\"}"
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 1,
      "hasMore": false
    },
    "stats": {
      "pending": 0,
      "processing": 0,
      "processed": 1250,
      "failed": 0,
      "dlq": 1,
      "total": 1251
    }
  }
}
```

---

### Replaying a DLQ Event
If the downstream system has recovered (e.g., database is back online), trigger a manual replay of a DLQ event using its unique ID:
```bash
curl -X POST "http://localhost:3000/api/v1/admin/webhooks/dlq/evt_123/replay" \
  -H "x-admin-key: your-configured-admin-secret"
```

#### Replay Confirmation Response
```json
{
  "success": true,
  "message": "Event evt_123 scheduled for replay"
}
```

---

### Database Integrity and Schema Alignment
If the database connection is unhealthy, operators should verify SQLite file access and check Prisma migration alignment.

```bash
# Check migrations status
npx prisma migrate status

# Check if migrations are pending execution
npx prisma migrate dev --create-only
```

---

### Testing Soroban RPC Connectivity Manually
If `/api/health` indicates Soroban RPC is degraded, check RPC response times directly:
```bash
curl -X POST "https://soroban-testnet.stellar.org" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger"}'
```

---

## 3. Escalation Paths

| Escalation Level | Severity / Symptoms | Actions & Resolution Steps |
| --- | --- | --- |
| **Tier 1 (First Responder)** | - Users report minor UI loading glitches.<br>- Client health dot is red. | 1. Query `/api/health` to pinpoint which service is offline.<br>2. Obtain the customer's `requestId` or wallet address.<br>3. Search logs for the `requestId` to identify context. |
| **Tier 2 (System Operator / SRE)** | - Database is unreachable (`database: { reachable: false }`).<br>- Soroban RPC is unreachable.<br>- DLQ items list is growing. | 1. **Database Lock**: Check storage volumes for capacity or locks; restart Next.js server.<br>2. **RPC Outage**: Check Stellar SDF Status Page. Swapping the RPC endpoint URL is required if SDF is experiencing prolonged outages.<br>3. **DLQ Transient Errors**: Once target systems recover, hit the `/replay` endpoint to resolve entries. |
| **Tier 3 (Engineering Escalation)** | - Specific transaction types fail signature verification consistently.<br>- Webhook validation fails with signature validation errors.<br>- Continuous 500 errors in Sentry for a single page route. | 1. **Code Regression**: Escalate to frontend/smart-contract devs to inspect matching commits.<br>2. **Signature Issues**: Check if anchor signature payload format changed, requiring middleware updates. |
