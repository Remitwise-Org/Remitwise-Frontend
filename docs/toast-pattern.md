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

### `dismiss(id)`

Programmatically remove a toast before its timer expires.

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
