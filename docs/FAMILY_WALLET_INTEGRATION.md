# Family Wallet Contract Integration

## Overview

This document describes the read/write integration layer for the `family_wallet` smart contract on Stellar blockchain.

## Status

🚧 **Contract Not Yet Deployed** - All endpoints currently return HTTP 501 (Not Implemented) until contract deployment is complete.

## Architecture

### Contract Layer (`lib/contracts/family-wallet.ts`)

Provides low-level integration with the Stellar smart contract:

- `getMember(id | address)` - Read single member data
- `getAllMembers(admin?)` - Read all members, optionally filtered by admin
- `buildAddMemberTx(admin, memberAddress, role, spendingLimit)` - Build transaction to add member
- `buildUpdateSpendingLimitTx(caller, memberId, newLimit)` - Build transaction to update limit
- `checkSpendingLimit(memberId, amount)` - Check if member can spend amount

### API Layer (`app/api/family/members/*`)

RESTful API endpoints with authentication and validation:

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/family/members` | Get all family members | Yes |
| GET | `/api/family/members/[id]` | Get specific member | Yes |
| POST | `/api/family/members` | Add new member | Admin only |
| PATCH | `/api/family/members/[id]/limit` | Update spending limit | Admin only |
| GET | `/api/family/members/[id]/check?amount=X` | Check spending limit | Yes |

## API Specifications

### GET /api/family/members

Get all family members.

**Query Parameters:**
- `admin` (optional): Filter by admin address

**Response:**
```json
{
  "members": [
    {
      "id": "member_123",
      "address": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "role": "sender",
      "spendingLimit": 1000,
      "currentSpending": 250,
      "addedAt": "2026-02-01T00:00:00Z",
      "updatedAt": "2026-02-15T00:00:00Z"
    }
  ]
}
```

### GET /api/family/members/[id]

Get a specific family member by ID.

**Response:**
```json
{
  "member": {
    "id": "member_123",
    "address": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "role": "sender",
    "spendingLimit": 1000,
    "currentSpending": 250
  }
}
```

### POST /api/family/members

Add a new family member (Admin only).

**Request Body:**
```json
{
  "address": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "role": "sender",
  "spendingLimit": 1000
}
```

**Validation:**
- `address`: Valid Stellar address (G + 55 alphanumeric characters)
- `role`: One of "admin", "sender", "recipient"
- `spendingLimit`: Non-negative number

**Response:**
```json
{
  "transactionXdr": "AAAAAgAAAAC...",
  "message": "Transaction built successfully. Sign and submit to add member."
}
```

### PATCH /api/family/members/[id]/limit

Update a member's spending limit (Admin only).

**Request Body:**
```json
{
  "limit": 2000
}
```

**Validation:**
- `limit`: Non-negative number

**Response:**
```json
{
  "transactionXdr": "AAAAAgAAAAC...",
  "message": "Transaction built successfully. Sign and submit to update spending limit."
}
```

### GET /api/family/members/[id]/check

Check if a member can spend a specific amount.

**Query Parameters:**
- `amount` (required): Amount to check in USD

**Response:**
```json
{
  "allowed": true,
  "currentSpending": 250,
  "spendingLimit": 1000,
  "remainingLimit": 750
}
```

## Authentication & Authorization

All endpoints require authentication. Authorization levels:

- **Any authenticated user**: Can read member data and check spending limits
- **Admin only**: Can add members and update spending limits

### Implementation Notes

1. Add session management middleware to extract user from request
2. Verify user role for admin-only operations
3. Ensure caller can only access their own family wallet data

## Error Handling

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (member doesn't exist)
- `500` - Internal Server Error
- `501` - Not Implemented (contract not deployed)

### Error Response Format

```json
{
  "error": "Error message",
  "message": "Detailed description (optional)",
  "documentation": "Reference to implementation (optional)"
}
```

## Integration Checklist

### Phase 1: Contract Deployment
- [ ] Deploy family_wallet contract to Stellar testnet
- [ ] Verify contract functions: add_member, update_spending_limit, get_member, etc.
- [ ] Document contract address and network

### Phase 2: Contract Layer Implementation
- [ ] Implement `getMember()` - Query contract state
- [ ] Implement `getAllMembers()` - Query contract state with filtering
- [ ] Implement `buildAddMemberTx()` - Build Stellar transaction XDR
- [ ] Implement `buildUpdateSpendingLimitTx()` - Build Stellar transaction XDR
- [ ] Implement `checkSpendingLimit()` - Query and calculate spending limits
- [ ] Add error handling for contract failures
- [ ] Add retry logic for network issues

### Phase 3: API Layer Implementation
- [ ] Implement session/auth middleware
- [ ] Uncomment validation logic in all routes
- [ ] Uncomment contract integration calls
- [ ] Remove 501 stub responses
- [ ] Add comprehensive error handling
- [ ] Add request logging

### Phase 4: Testing
- [ ] Unit tests for contract layer functions
- [ ] Integration tests for API endpoints
- [ ] Test authentication and authorization
- [ ] Test validation logic
- [ ] Test error scenarios

### Phase 5: Frontend Integration
- [ ] Update family page to call API endpoints
- [ ] Add member management UI
- [ ] Add spending limit update UI
- [ ] Add real-time spending checks
- [ ] Handle transaction signing flow

## Security Considerations

1. **Address Validation**: Always validate Stellar addresses before contract calls
2. **Role-Based Access**: Enforce admin-only operations at API level
3. **Spending Limits**: Validate limits are non-negative and reasonable
4. **Rate Limiting**: Consider adding rate limits to prevent abuse
5. **Transaction Signing**: Never sign transactions server-side; return XDR for client signing

## Example Usage

### Adding a Member (Frontend)

```typescript
const response = await fetch('/api/family/members', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    role: 'sender',
    spendingLimit: 1000
  })
});

const { transactionXdr } = await response.json();
// Sign and submit transaction using Stellar SDK
```

### Checking Spending Limit

```typescript
const memberId = 'member_123';
const amount = 500;
const response = await fetch(`/api/family/members/${memberId}/check?amount=${amount}`);
const { allowed, remainingLimit } = await response.json();

if (allowed) {
  // Proceed with transaction
} else {
  // Show error: spending limit exceeded
}
```

## Contract Interface (Expected)

The contract layer expects the following contract functions:

```rust
// Pseudo-code representation
pub fn add_member(admin: Address, member: Address, role: u32, limit: i128);
pub fn update_spending_limit(caller: Address, member_id: BytesN<32>, new_limit: i128);
pub fn get_member(identifier: BytesN<32>) -> Member;
pub fn get_all_members(admin: Option<Address>) -> Vec<Member>;
pub fn check_spending_limit(member_id: BytesN<32>, amount: i128) -> bool;
```

## Next Steps

1. Deploy the family_wallet contract
2. Update contract address in `lib/contracts/family-wallet.ts`
3. Implement contract integration functions
4. Uncomment API route logic
5. Add authentication middleware
6. Test end-to-end flow
