# Remittance API Documentation

## Endpoints

### 1. GET /api/remittance/history
Fetch transaction history for the logged-in wallet.

**Protection:** Requires an active session (iron-session). Returns 401 if not authenticated.

**Parameters:**
- `limit` (optional): Number of records to return (default: 10, max: 200).
- `cursor` (optional): Paging token for pagination.
- `status` (optional): Filter by transaction status (`completed`, `failed`).

**Response Body:**
```json
{
  "transactions": [
    {
      "id": "123...",
      "hash": "abc...",
      "amount": "100.00",
      "currency": "XLM",
      "recipient": "G...",
      "sender": "G...",
      "date": "2024-01-01T00:00:00Z",
      "status": "completed",
      "memo": "Rent payment"
    }
  ],
  "nextCursor": "paging_token_here"
}
```

### 2. GET /api/remittance/status/[txHash]
Fetch the current status of a single transaction.

**Parameters:**
- `txHash`: The 64-character hex transaction hash.

**Response Body:**
```json
{
  "hash": "abc...",
  "status": "completed"
}
```
*Status values: `completed`, `failed`, `pending`, `not_found`.*

## Pagination
Pagination is handled via the `cursor` parameter. The response includes a `nextCursor` which should be passed as the `cursor` in the subsequent request to fetch the next page of results. Records are returned in descending order (newest first).

## Rate Limits
This API utilizes the Stellar Horizon network. 
- **Public Testnet (SDF):** Approximately 3,600 requests per hour per IP. 
- **Production:** Rate limits depend on the specific Horizon instance being used. It is recommended to implement client-side caching or exponential backoff for high-volume applications and monitor `X-Ratelimit-*` headers from Horizon if possible.

## Emergency Transfers & Policy Limits
Emergency transfers (`POST /api/v1/remittance/emergency/build`) are the highest-risk money movement in the app. They bypass standard holding periods but are strictly capped to prevent abuse.

### Configured Limits (Default)
Limits are enforced at three distinct levels, measured in Stroops (1 XLM = 10,000,000 Stroops) where applicable:
1. **Per-Transfer Limit:** `10,000,000,000` (1,000 XLM)
2. **Daily Limit:** `50,000,000,000` (5,000 XLM) - *Aggregated from usage starting at 00:00:00 each day*
3. **Monthly Count:** `10` transfers max - *Resets on the 1st of each month*

### Validation Enforcement
Before an emergency transaction is built, the `PolicyService` aggregates historical usage via the `EventStorageService`. If any limit is exceeded, the build route will reject the transaction with an HTTP `400 Bad Request` and an array of specific limit violation errors. 

**Note on Arithmetic:** Because limits and amounts are handled in Stroops, they frequently exceed JavaScript's `Number.MAX_SAFE_INTEGER`. All policy aggregations and comparisons strictly use `BigInt` to prevent floating-point drift.
