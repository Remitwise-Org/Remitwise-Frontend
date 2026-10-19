# Family Multisig Approval UX

## Overview

Member-management actions on a Family Wallet — adding a member or updating a spending limit — require multi-signature approval before the underlying Stellar transaction can be submitted. This document covers the UX state machine, component anatomy, and role definitions that govern the approval flow.

---

## State machine

```
Admin initiates action
        │
        ▼
useApprovalsQueue.enqueueAddMember() / enqueueUpdateLimit()
        │
        ├─ dispatch ENQUEUE         → status: building
        │                             (XDR is being constructed)
        ▼
buildAddMemberTx() / buildUpdateSpendingLimitTx() resolves
        │
        ├─ dispatch SET_XDR         → status: requested
        │                             (awaiting first approval)
        ▼
Approver clicks Approve on ApprovalRequestCard
        │
        ├─ dispatch SET_STATUS      → status: signing
        │                             (wallet modal is open)
        ▼
wallet-kit signTransaction() resolves
        │
        ├─ dispatch ADD_SIGNATURE
        │     ├─ collected < required  → status: partially_approved
        │     └─ collected >= required → status: approved  ✓ terminal
        │
Approver clicks Reject
        │
        └─ dispatch REJECT          → status: rejected  ✗ terminal

EXPIRE_ALL (runs on mount + every 60 s)
        │
        └─ requested | partially_approved older than 30 min → status: expired  ✗ terminal
```

### State definitions

| Status | Semantics | Terminal? |
|--------|-----------|-----------|
| `building` | XDR is being constructed by the contract helper | No |
| `requested` | XDR ready; awaiting the first required signature | No |
| `partially_approved` | At least one signature collected; more still required | No |
| `signing` | Current user's wallet modal is open (transient) | No |
| `approved` | All required signatures collected | **Yes** |
| `rejected` | An authorised approver rejected the request | **Yes** |
| `expired` | No action taken within 30 minutes (`APPROVAL_TTL_MS`) | **Yes** |

Non-terminal states accept Approve and Reject actions. Terminal states are read-only and appear in the history list.

---

## Component anatomy

### `ApprovalRequestCard`

File: `app/family/components/ApprovalRequestCard.tsx`

```
┌──────────────────────────────────────────────────────┐
│ [Avatar] GDEMO1… / Requester       [Status badge 🕐] │
├──────────────────────────────────────────────────────┤
│ [Icon] Add GDEMO2…          [Action type pill]       │
│ Amount: $500                                         │
├──────────────────────────────────────────────────────┤
│ [●] [·] [·]   1 of 3 approvals                      │
│   filled avatars = signed; empty dots = awaiting     │
├──────────────────────────────────────────────────────┤
│ [✓ Approve]          [✗ Reject]                      │
└──────────────────────────────────────────────────────┘
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `item` | `ApprovalItem` | The queue item to display |
| `canAct` | `boolean` | Whether the viewer can approve/reject (wallet connected) |
| `onApprove` | `(id: string) => void` | Called when Approve is clicked |
| `onReject` | `(id: string) => void` | Called when Reject is clicked |

### `ApprovalsQueue`

File: `app/family/components/ApprovalsQueue.tsx`

Renders two sections inside a `<section>` panel:

1. **Pending approvals** — items with non-terminal status (`building`, `requested`, `partially_approved`, `signing`). Each item rendered as `<ApprovalRequestCard>`. Shows "No pending approvals" empty state when list is empty.
2. **History** — items with terminal status (`approved`, `rejected`, `expired`). Rendered as compact `<HistoryRow>` entries. Only shown when there are history items.

### `useApprovalsQueue` hook

File: `lib/hooks/useApprovalsQueue.ts`

Extended with:
- `rejectItem(id, rejectorAddress)` — transitions `requested | partially_approved → rejected`.
- `requester` field on `ApprovalItem` — Stellar address of the initiating admin.
- `amount` field on `ApprovalItem` — the spending limit value involved.
- `ADD_SIGNATURE` now produces `partially_approved` when `collected < required` (previously always `pending`).
- `EXPIRE_ALL` targets `requested | partially_approved` instead of just `pending`.

---

## Status presentation tokens

Status is **never conveyed by colour alone** (WCAG 2.1 AA). Each status uses both an icon and a text label in all contexts.

| Status | Tone | Token classes | Icon |
|--------|------|---------------|------|
| `requested` | warning | `border-status-warning-border bg-status-warning-bg text-status-warning-fg` | `Clock3` |
| `partially_approved` | info | `border-status-info-border bg-status-info-bg text-status-info-fg` | `GitMerge` |
| `approved` | success | `border-status-success-border bg-status-success-bg text-status-success-fg` | `CheckCircle2` |
| `rejected` | error | `border-status-error-border bg-status-error-bg text-status-error-fg` | `XCircle` |
| `expired` | neutral | `border-white/[0.06] bg-white/[0.02] text-gray-500` | `Timer` |
| `building` | neutral | `border-white/10 bg-white/[0.03] text-gray-400` | `Loader2` (spin) |
| `signing` | — | `border-red-500/30 bg-red-500/[0.08] text-red-200` | `Loader2` (spin) |

---

## Role definitions

Tied to `UnderstandingRolesSection` content (file: `app/family/components/UnderstandingRolesSection.tsx`):

### Admin (Crown icon, amber accent)
- Can initiate any member-management action (`add_member`, `update_spending_limit`).
- Appears as **requester** on all approval cards.
- Can approve or reject approval requests raised by other admins.
- Required signature count is set at enqueue time (`requiredSignatures`).

### Sender (Send icon, sky accent)
- Can send transactions within their spending limit.
- Cannot initiate member-management actions.
- May appear as an approver if the wallet contract requires non-admin co-signers (future).

### Recipient (Wallet icon, emerald accent)
- Receives funds; cannot initiate or approve member-management actions.
- Cannot interact with the ApprovalRequestCard.

### Approver slots

The `ApproverAvatars` sub-component renders one avatar per required signature slot. Filled slots (signed) display the first character of the signer's Stellar address; empty slots show a placeholder dot. Each avatar has a descriptive `aria-label` and `title` for keyboard and screen-reader users.

---

## Accessibility

- All status badges carry `role="status"` and `aria-label="Status: {label}"`.
- `ApprovalRequestCard` `<article>` has a full descriptive `aria-label` combining action type, requester, and status.
- Approve and Reject buttons have explicit `aria-label` attributes that include the item label.
- Approve button is linked to the progress description via `aria-describedby`.
- A `.sr-only` span broadcasts the signature progress for screen readers.
- `ApproverAvatars` container has `aria-label` summarising `{n} of {m} approvers signed`.
- Error messages use `role="alert"`.
- History list uses `<ol>` with `aria-label="Approval history"`.
- Pending list uses `<ol>` with `aria-label` drawn from the `approvals_queue.list_aria` i18n key.
- Pending badge count uses `aria-live="polite"`.
- Button focus rings: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2` on both action buttons.

---

## Layout integration

`ApprovalsQueue` sits in the sticky aside column of `app/family/page.tsx`, above `UnderstandingRolesSection`:

```
<aside class="space-y-8 xl:sticky xl:top-6">
  <ApprovalsQueue />           ← pending cards + history
  <UnderstandingRolesSection />
  <!-- add-member form -->
</aside>
```

The card's inner layout is responsive — wraps at narrow widths (375 px) and expands at 1280 px using `flex-wrap` throughout.

---

## i18n

All string keys are under `approvals_queue.*` in `lib/i18n/locales/en.json` and `es.json`. New hardcoded strings in `ApprovalRequestCard` (e.g. "Approver", "Approve", "Reject", action labels, progress text) should be moved to i18n keys once the translation pipeline is ready.
