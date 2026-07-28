# Toast / Notification Pattern

Lightweight, accessible feedback for transient events. Use toasts for outcomes
the user needs to know about but does not need to act on immediately.

## Files

| File | Purpose |
|------|---------|
| `lib/context/ToastContext.tsx` | `ToastProvider`, `useToast` hook, types |
| `components/Toast.tsx` | Single toast item |
| `components/ToastRegion.tsx` | Fixed `aria-live` region — renders the queue |

`ToastProvider` and `ToastRegion` are wired in `app/layout.tsx` and available
everywhere in the app.

## Usage

```tsx
import { useToast } from "@/lib/context/ToastContext";

const { toast } = useToast();

// Success
toast({ variant: "success", title: "Transfer sent", description: "Funds are on their way." });

// Error — require manual dismissal
toast({ variant: "error", title: "Transfer failed", description: "Check your balance and try again.", duration: 0 });

// With action
toast({
  variant: "warning",
  title: "Bill overdue",
  description: "Electricity bill is 3 days overdue.",
  action: { label: "Pay now", onClick: () => router.push("/bills") },
});
```

## API

### `toast(options)` → `id: string`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `variant` | `"success" \| "error" \| "warning" \| "info"` | required | Visual and semantic tone |
| `title` | `string` | required | Primary message (keep ≤60 chars) |
| `description` | `string` | — | Supporting detail (keep ≤120 chars) |
| `action` | `{ label, onClick }` | — | Optional inline CTA |
| `duration` | `number` (ms) | `5000` | Pass `0` to require manual dismissal |
| `diagnostics` | `DiagnosticDetails` | — | Error diagnostic info (error variant only) |

### `DiagnosticDetails` (optional, error variant only)

Error toasts can include optional diagnostic details accessible via a collapsed "What failed" disclosure:

| Property | Type | Description |
|----------|------|-------------|
| `requestId` | `string` | Request ID for support tracking (displayed in monospace for easy copying) |
| `errorCode` | `string` | Error code for categorization (e.g., `ERR_500`, `AUTH_FAILED`) |
| `timestamp` | `string` | ISO 8601 timestamp when the error occurred |

The `description` field is automatically included in the disclosure as "Error Message".

**Example:**

```tsx
toast({
  variant: "error",
  title: "Transfer failed",
  description: "Your account balance is too low.",
  duration: 0,
  diagnostics: {
    requestId: "9d0f8c5d-1c7a-4d53-a74c-xxxxxxxx4",
    errorCode: "INSUFFICIENT_BALANCE",
    timestamp: new Date().toISOString(),
  },
});
```

### Disclosure Behavior

- The "What failed" disclosure appears **only on error toasts** with at least one diagnostic field.
- It is **collapsed by default** to keep the toast clean and uncluttered.
- Clicking the button expands it to reveal diagnostic details.
- The disclosure is fully keyboard accessible (Enter/Space to toggle).
- Request IDs are displayed in monospace and have `select-all` styling for easy copying.

### `dismiss(id)`

Programmatically remove a toast before its timer expires. Dismissed toasts are archived in the provider history so they can be surfaced in the recent notifications list.

### `history`

The provider keeps a compact history of recently dismissed toasts (up to 10 items). This is exposed via `useToast()` as `history` and is rendered by `ToastRegion` as a small "Recent notifications" list beneath the active toast stack.

### `clearHistory()`

Programmatically clear the archived toast history when the UI needs a fresh notification log.

## Variants and when to use them

| Variant | Tone | Use for |
|---------|------|---------|
| `success` | Green | Completed actions: transfer sent, bill paid, goal saved |
| `error` | Red | Failed actions: submission error, network failure |
| `warning` | Amber | Recoverable issues: overdue bill, low balance |
| `info` | Blue | Neutral updates: session refreshed, feature note |

## Placement

- **Desktop (sm+):** fixed top-right, stacked vertically, newest on top.
- **Mobile:** fixed bottom-center, full-width up to `max-w-sm`.

## Dismissal behavior

- Auto-dismiss after `duration` ms (default 5 s).
- Pass `duration: 0` for errors or actions that require the user to respond.
- Manual dismiss via the × button — always present.
- Do not auto-dismiss toasts that have an `action`.

## Accessibility (WCAG 2.1 AA)

- Each toast uses `role="status"` + `aria-atomic="true"` → maps to
  `aria-live="polite"`. Screen readers announce the toast without interrupting
  the current reading flow.
- For critical errors that must interrupt immediately, set `duration: 0` so the
  toast persists; the user's next focus shift will encounter it.
- The dismiss button has `aria-label="Dismiss notification"` and a visible
  focus ring (`focus-visible:ring-2`).
- Color is never the sole differentiator — each variant uses a distinct icon.
- The `ToastRegion` container has `aria-label="Notifications"`.

## Anti-fatigue rules

- Show at most **3 toasts** simultaneously. Queue additional toasts; they appear
  as earlier ones dismiss.
- Keep a compact recent-history list (up to 10 items) for dismissed notifications
  so users can still review outcomes that already disappeared from the active stack.
- Do not toast on every keystroke or polling tick — only on user-initiated
  outcomes or significant background events.
- Prefer `description` over a second toast for supporting detail.
- Success toasts for routine actions (e.g. form auto-save) should use a short
  `duration` (2–3 s) and no description.

## Key flow integration points

| Flow | Event | Variant |
|------|-------|---------|
| Send money | Transfer submitted | `success` |
| Send money | Submission failed | `error` (duration: 0) |
| Bills | Bill paid | `success` |
| Bills | Payment failed | `error` (duration: 0) |
| Bills | Bill overdue reminder | `warning` + action → `/bills` |
| Settings | Preferences saved | `success` (short duration) |
| Session | Session expired | `error` (duration: 0) — replaces `SessionExpiryNotification` |
| Approvals queue | Signature collected (approval threshold not yet met) | `success` |
| Approvals queue | Approval threshold reached (item approved) | `success` |
| Approvals queue | Signing failed | `error` (duration: 0) |
| Policy (pay) | Premium payment XDR ready | `success` |
| Policy (pay) | Payment request failed | `error` (duration: 0) |
| Policy (deactivate) | Policy deactivated | `success` |
| Policy (deactivate) | Deactivation request failed | `error` (duration: 0) |
