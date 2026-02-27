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
