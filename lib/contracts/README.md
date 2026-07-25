# Contract Integration Layer

This directory contains integration modules for Stellar smart contracts.

## One Canonical Soroban Client — Server-Only

**All contract modules must import the Soroban RPC client from `lib/soroban/client.ts`.**

```ts
// ✅ correct
import { getServer, getNetworkPassphrase } from "@/lib/soroban/client";

// ❌ never use the deprecated public client
import { getSorobanClient } from "@/lib/soroban-client";
```

### Why one client?

| Concern | `lib/soroban-client.ts` (old, deprecated) | `lib/soroban/client.ts` (canonical) |
|---|---|---|
| Env var | `NEXT_PUBLIC_SOROBAN_RPC_URL` — **bundled into browser** | `SOROBAN_RPC_URL` — server-only |
| Network | Hardcoded `Networks.TESTNET` | Resolved via `getSorobanNetworkPassphrase()` |
| Retry/timeout | None | `withRetry()` + per-attempt timeout |

Using the public client leaks the RPC URL to the browser and pins testnet, so
transactions would build against the wrong network in production.

### Server-only enforcement

These modules must **never** be imported into a `'use client'` component.
If you need contract data in the browser, fetch it through an API route that
calls this layer on the server.

## Network-based Contract Resolution

Server-side contract modules resolve IDs from `SOROBAN_NETWORK` (`testnet` or
`mainnet`) using:

- per-network env vars like `REMITTANCE_SPLIT_CONTRACT_ID_TESTNET` and
  `REMITTANCE_SPLIT_CONTRACT_ID_MAINNET`, or
- a single `CONTRACT_IDS_JSON` value keyed by network.

Shared resolver: `lib/contracts/network-resolution.ts`.

## family-wallet.ts

Contract read/write layer for the family wallet functionality.

**Status**: Stubbed — awaiting contract deployment

**Functions**:
- `getMember(id | address)` — Retrieve member data
- `getAllMembers(admin?)` — List all members
- `buildAddMemberTx(...)` — Build add member transaction
- `buildUpdateSpendingLimitTx(...)` — Build update limit transaction
- `checkSpendingLimit(...)` — Verify spending allowance

See `/docs/FAMILY_WALLET_INTEGRATION.md` for complete documentation.
