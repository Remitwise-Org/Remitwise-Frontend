# Metrics and Request Duration Logging

## Log Format
Each API request is logged to stdout in structured JSON format:

```
{
  "requestId": "string",      // Unique ID for correlation
  "method": "string",         // HTTP method (GET, POST, etc.)
  "path": "string",           // Request path
  "statusCode": number,        // Response status code
  "durationMs": number,        // Request duration in milliseconds
  "timestamp": "string"       // ISO timestamp
}
```

Example:
```
{"requestId":"abc123xy","method":"POST","path":"/api/user/profile","statusCode":200,"durationMs":42,"timestamp":"2026-02-26T12:34:56.789Z"}
```

## Metrics Endpoint

- **Route:** `GET /api/metrics`
- **Access:** Admin only (requires `x-admin: true` header)
- **Response:** JSON object with request and error counts per route/method

Example response:
```
{
  "GET /api/user/profile": { "count": 10, "errorCount": 2 },
  "POST /api/user/profile": { "count": 5, "errorCount": 0 }
}
```

## Notes
- Request body is not logged.
- Each response includes an `X-Request-ID` header for correlation.
- Metrics are stored in-memory (not persistent).
- For production, replace admin check with real authentication.
