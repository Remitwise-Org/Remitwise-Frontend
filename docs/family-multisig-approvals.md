# Family Wallet Multisig Pending-Approvals Queue

## Overview

Member-management actions on a Family Wallet — adding a member or updating a spending limit — are prepared as unsigned Stellar transaction XDRs by `buildAddMemberTx` and `buildUpdateSpendingLimitTx` in `lib/contracts/family-wallet.ts`. Before any of those transactions can be submitted, they need co-signer review. This document describes the approvals queue that surfaces those transactions.

## Component map

| File | Role |
|------|------|
| `lib/hooks/useApprovalsQueue.ts` | Hook holding queue state and signing flow |
| `app/family/components/ApprovalsQueue.tsx` | UI panel rendered on the Family Wallets page |
| `app/family/page.tsx` | Mounts `<ApprovalsQueue />` in the aside column |
| `lib/i18n/locales/en.json` `es.json` | `approvals_queue.*` strings |
| `tests/unit/hooks/useApprovalsQueue.test.ts` | Unit + integration tests for the hook |

## Multisig flow

```
Admin action (e.g. Add Member)
        │
        ▼
useApprovalsQueue.enqueueAddMember()
        │
        ├─ dispatch ENQUEUE (status: building)
        │
        ▼
buildAddMemberTx() → XDR string
        │
        ├─ dispatch SET_XDR  (status: pending)
        │
        ▼
ApprovalsQueue panel shows item with [Sign] button
        │
Co-signer clicks Sign
        │
        ▼
useApprovalsQueue.signItem(id, signerAddress, signXdr)
        │
        ├─ dispatch SET_STATUS signing
        ├─ wallet-kit signTransaction(xdr)   ← no new primitive
        ├─ dispatch ADD_SIGNATURE
        │     ├─ collected < required → status: pending  (awaiting more sigs)
        │     └─ collected >= required → status: approved
        │
        └─ on error → status: pending + error message (user can retry)
```

## Item states

| Status | Meaning |
|--------|---------|
| `building` | XDR is being constructed by the contract helper |
| `pending` | XDR ready; awaiting required signatures |
| `signing` | Current user's wallet modal is open |
| `approved` | All required signatures collected |
| `expired` | Not signed within 30 minutes (`APPROVAL_TTL_MS`) |

## Wallet-kit integration

Signing is routed through `signTransaction` from `useWallet()` (stellar-wallet-kit). No new signing primitive is introduced. The `signXdr` callback passed to `signItem` calls `wallet.signTransaction(xdr)` and resolves the signed XDR string. The hook is agnostic to the wallet implementation.

## Client-side state

The queue lives in React `useReducer` state for now. The hook interface is designed so the data source can be swapped to an API (e.g. `GET /api/family/approvals`, `POST /api/family/approvals/:id/sign`) without changing any component code — replace the `useReducer` internals and keep the same return shape.

## Expiry

`expireStale()` is called on mount and every 60 seconds by `ApprovalsQueue`. It marks any `pending` items older than `APPROVAL_TTL_MS` (30 min) as `expired`. Expired items are hidden from the visible list.

## Accessibility

- Queue list is rendered as `<ol>` with `aria-label`.
- Each row is an `<article>` with a descriptive `aria-label`.
- Sign button has an `aria-label` with the item label.
- Wallet disconnected state uses `AsyncSubmissionStatus` with `role="status"`.
- Error messages use `role="alert"`.

## i18n

All strings are under the `approvals_queue.*` namespace in `lib/i18n/locales/en.json` and `es.json`.

## Testing

```bash
npx vitest run tests/unit/hooks/useApprovalsQueue.test.ts
```

Tests cover all reducer branches (ENQUEUE, SET_XDR, SET_STATUS, ADD_SIGNATURE, EXPIRE_ALL, default) plus hook integration scenarios: success/failure of both build helpers, successful sign, sign rejection with revert, duplicate signer guard, and no-op on non-pending items.
