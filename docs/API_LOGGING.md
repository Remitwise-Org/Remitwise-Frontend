# API Request Logging

Structured JSON request/response logging for all `/api` routes.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Edge Middleware (middleware.ts)                 │
│  • Injects / propagates x-request-id header     │
│  • Matches /api/:path* only                     │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  withApiLogger()  (lib/api-logger-middleware.ts) │
│  • Measures duration (performance.now)           │
│  • Reads Content-Length for response size        │
│  • Emits ONE structured JSON log line via pino   │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  pino logger  (lib/logger.ts)                    │
│  • JSON to stdout                                │
│  • Redact paths for defence-in-depth             │
└──────────────────────────────────────────────────┘
```

---

## Log Schema

Every API request produces **exactly one** JSON log line:

| Field              | Type            | Description                                                  |
| ------------------ | --------------- | ------------------------------------------------------------ |
| `level`            | `string`        | Log level (`info`, `error`)                                  |
| `time`             | `string`        | ISO 8601 timestamp                                           |
| `msg`              | `string`        | Always `"api_request"` for normal requests                   |
| `method`           | `string`        | HTTP method (`GET`, `POST`, etc.)                            |
| `path`             | `string`        | URL pathname **without** query parameters                    |
| `statusCode`       | `number`        | HTTP status code of the response                             |
| `durationMs`       | `number`        | Wall-clock time spent in the handler (ms, 2 decimal places)  |
| `requestId`        | `string`        | UUID v4 — from `x-request-id` header or auto-generated       |
| `responseSizeBytes`| `number\|null`  | Value of the `Content-Length` header, or `null` if absent     |

### Example Log Entry

```json
{
  "level": "info",
  "time": "2026-02-25T10:30:00.123Z",
  "msg": "api_request",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 200,
  "durationMs": 42.17,
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "responseSizeBytes": 256
}
```

---

## What is NEVER Logged

The following data is **strictly excluded** from all log output:

- ❌ Request body
- ❌ Response body
- ❌ Headers (especially `Authorization`, `Cookie`, `Set-Cookie`)
- ❌ Passwords, tokens, secrets, signatures
- ❌ Query parameters (only the pathname is logged)
- ❌ Full email addresses (only domain, and only when explicitly opted in)
- ❌ Full wallet/blockchain addresses (only first 6 chars, and only when opted in)

---

## Wiring: How to Use

### 1. Wrap your route handler

```ts
// app/api/goals/route.ts
import { NextResponse } from "next/server";
import { withApiLogger } from "@/lib/api-logger-middleware";

export const GET = withApiLogger(async (request) => {
  const goals = await fetchGoals();
  return NextResponse.json(goals);
});

export const POST = withApiLogger(async (request) => {
  const body = await request.json();
  const goal = await createGoal(body);
  return NextResponse.json(goal, { status: 201 });
});
```

### 2. Edge middleware (already configured)

The root `middleware.ts` automatically injects `x-request-id` for every `/api` request. No additional setup is needed.

### 3. Optional: sanitised logging inside handlers

```ts
import {
  withApiLogger,
  sanitizeAddress,
  sanitizeEmail,
} from "@/lib/api-logger-middleware";
import logger from "@/lib/logger";

export const POST = withApiLogger(async (request) => {
  const { address, email } = await request.json();

  // Log sanitised fields — never the raw values
  const reqId = request.headers.get("x-request-id");
  logger.child({ requestId: reqId }).info({
    msg: "user_lookup",
    addressPrefix: sanitizeAddress(address), // "GABCDE"
    emailDomain: sanitizeEmail(email),       // "example.com"
  });

  return NextResponse.json({ ok: true });
});
```

---

## Correlating Logs with `requestId`

### Within a single service

Every log line for a given request shares the same `requestId`. Use `jq` to filter:

```bash
# All logs for a specific request
cat app.log | jq 'select(.requestId == "a1b2c3d4-...")'
```

### Across services (distributed tracing)

1. **Client → RemitWise API**: The client (or API gateway) sets the `x-request-id` header on the outgoing request.
2. **RemitWise API → downstream**: When calling another service (e.g. a webhook, Soroban RPC, or payment provider), forward the same `x-request-id`:

   ```ts
   const requestId = request.headers.get("x-request-id");

   const downstreamResponse = await fetch("https://payment-provider.com/charge", {
     headers: {
       "x-request-id": requestId!,
       // ... other headers
     },
     body: JSON.stringify(payload),
   });
   ```

3. **Downstream service** should also log the `x-request-id`, enabling end-to-end correlation.
4. **Response**: The `x-request-id` is always returned in the response headers so the calling client can reference it in support tickets or debugging.

### With log aggregation tools

In **Datadog**, **Grafana Loki**, or **CloudWatch Insights**, query by `requestId`:

```
# CloudWatch Insights
fields @timestamp, method, path, statusCode, durationMs
| filter requestId = "a1b2c3d4-..."
| sort @timestamp asc
```

```
# Grafana Loki
{app="remitwise"} | json | requestId="a1b2c3d4-..."
```

---

## Running Tests

```bash
# Install dependencies (if not already)
npm install pino

# Run the logging tests
npx tsx --test tests/api-logger.test.ts
```

### Test Coverage

| Test                                       | Asserts                                          |
| ------------------------------------------ | ------------------------------------------------ |
| Emits structured JSON with correct schema  | All 6 fields present with correct types          |
| Generates requestId when missing           | `x-request-id` response header is populated      |
| Forwards client-supplied requestId         | Client ID is echoed back unchanged               |
| NEVER logs secrets                         | Passwords, tokens, auth, cookies, body absent    |
| Does NOT log query parameters              | Path contains no `?` or query values             |
| sanitizeAddress                            | Returns first 6 chars only                       |
| sanitizeEmail                              | Returns domain only                              |

---

## Configuration

| Environment Variable | Default  | Description                         |
| -------------------- | -------- | ----------------------------------- |
| `LOG_LEVEL`          | `"info"` | Pino log level (trace → fatal)      |
