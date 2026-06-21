# Insurance Policy Lifecycle

## Overview

The micro-insurance module manages on-chain insurance policies through a complete
lifecycle: creation → active coverage → premium payments → deactivation.

## Policy States

| State | Description | UI Indicator |
|-------|-------------|------------|
| **Active** | Policy is in force, premiums due on schedule | Green badge |
| **Due soon** | Premium due within 3 days | Amber badge |
| **Overdue** | Premium past due date | Red badge |
| **Deactivated** | Policy permanently ended | Gray badge |

## Flow Diagram
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Create    │────▶│   Active    │────▶│  Pay Premium    │
│   Policy    │     │  (coverage) │◄────│  (monthly)      │
└─────────────┘     └──────┬──────┘     └─────────────────┘
│
▼
┌─────────────┐
│ Deactivate  │
│ (irrevers.) │
└─────────────┘


## User Flows

### 1. View Policy Detail
1. User clicks **"View Details"** on a policy card
2. `PolicyDetail` dialog opens with focus trap + ESC close
3. Dialog shows: coverage, premium, next due date, status
4. Available actions depend on `policy.active`

### 2. Pay Premium
1. User clicks **"Pay Premium Now"** → confirm guard appears
2. Confirm shows amount (e.g., "$100.00")
3. On confirm: `usePolicyActions.payPremium(policyId)` fires
4. Backend returns XDR → user signs via wallet
5. On success: status updates, next payment date advances

**Edge cases handled:**
- Already paid this period (backend rejects, UI shows error)
- Insufficient wallet balance (transaction submission fails)
- Session expired (redirected to reconnect)

### 3. Deactivate Policy
1. User clicks **"Deactivate Policy"** → **irreversible confirm**
2. Warning explicitly states: "permanently deactivate", "lose coverage immediately"
3. On confirm: `usePolicyActions.deactivate(policyId)` fires
4. Backend returns XDR → user signs via wallet
5. Policy status changes to `active: false`

**Edge cases handled:**
- Already deactivated (button hidden, notice shown)
- Not owner (403 from backend with i18n error)
- Active claim in progress (contract-level rejection)

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/v1/insurance` | Create new policy (returns XDR) |
| `POST` | `/api/v1/insurance/:id/pay` | Pay premium (returns XDR) |
| `POST` | `/api/v1/insurance/:id/deactivate` | Deactivate policy (returns XDR) |

All endpoints require `x-user` header with valid Stellar public key.

## Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `PolicyDetail` | `components/insurance/PolicyDetail.tsx` | Accessible dialog, confirm guards, async status |
| `usePolicyActions` | `hooks/usePolicyActions.ts` | Pay/deactivate mutations, deduplication, error handling |
| `PolicyCard` | `app/insurance/page.tsx` | List item, opens detail dialog |

## Accessibility

- Dialog: `role="dialog"`, `aria-modal="true"`, focus trap, ESC to close
- Confirm guards: Clear warning language, high-contrast colors
- Status announcements: `AsyncSubmissionStatus` with live regions
- Keyboard navigation: Tab cycles through all interactive elements

## i18n

Supported languages: `en`, `es`

All user-facing strings use the `t()` translator pattern. Add new keys to:
- `lib/i18n/locales/en.json`
- `lib/i18n/locales/es.json`