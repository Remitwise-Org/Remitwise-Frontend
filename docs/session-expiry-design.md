# Session Expiry — UI/UX Design

## Overview

The session expiry experience has three states: **warning**, **expired**, and **re-auth**. The design prioritises not interrupting an in-progress remittance while keeping the user informed.

---

## Three States

### 1. Warning — "Session expiring"

**When it appears**
- The backend or an idle timer signals the session is about to expire.
- The warning appears at `SESSION_MAX_AGE` - 120s (or whatever countdown value is sent).

**Placement**
- Fixed top-right on desktop (`sm:right-4 sm:top-4`), full-width top on mobile (`left-4 right-4 top-4`).
- Sits above page content without shifting layout.
- Uses `z-[110]` — above the toast region (`z-[100]`) so it is not obscured by other notifications.

**Visual treatment**
- Warning status tokens: `border-status-warning-border`, `bg-status-warning-soft`, `text-status-warning-fg` (amber palette).
- `AlertTriangle` icon.
- `rounded-2xl border p-4 shadow-lg backdrop-blur-md` — identical to the Toast component.
- Animates in via `animate-slide-in-bottom` (mobile) / `animate-slide-in-right` (desktop).

**Content**
| Element | Copy |
|---|---|
| Title | "Session expiring" |
| Body | `message` from event detail (default: "Your session is about to expire. For your security, you will be signed out automatically.") |
| Countdown | `Clock` icon + MM:SS (monospaced, tabular-nums) |
| Action button | "Stay signed in" — amber text on dark bg |
| Dismiss | `X` button — labelled "Dismiss notification" |

**Interaction**
- "Stay signed in" dispatches a `session-refresh` custom event, which the provider listens for to reset the warning.
- `Escape` key or `X` button dismisses the warning.
- Focus moves to the "Stay signed in" button on mount.

**Timing**
- Default countdown: 120 seconds.
- Countdown decrements every second.
- At 0s the warning auto-transitions to the expired state.
- Countdown is local — the backend can dispatch a new `session-expiring` event at any time to restart the timer.

### 2. Expired — "Session expired"

**When it appears**
- The countdown reached 0 and no refresh occurred, **or** an API call returned 401 with `"Session expired"` (existing `handleSessionExpiry` flow).

**Placement**
- Same position as the warning (top-right desktop, full-width mobile).
- Same z-index and styling tokens, but using the error palette.

**Visual treatment**
- Error status tokens: `border-status-error-border`, `bg-status-error-soft`, `text-status-error-fg` (red palette).
- `AlertCircle` icon.
- Same `rounded-2xl`, `border`, `backdrop-blur` as warning and toast.

**Content**
| Element | Copy |
|---|---|
| Title | "Session expired" |
| Body | "Your session has expired. Please reconnect your wallet to continue." |
| Action button | "Reconnect wallet" — red text on dark bg |
| Dismiss | `X` button |

**Interaction**
- "Reconnect wallet" navigates to `/` (home/wallet connection page). The existing `redirect_after_auth` localStorage mechanism restores the user's intended destination.
- `Escape` or `X` dismisses.
- Focus moves to "Reconnect wallet" button on mount.
- Auto-redirect to `/` fires after 15 seconds as a safety net.

### 3. Re-auth — Context preservation

**Flow**
1. User clicks "Reconnect wallet" (or auto-redirect fires).
2. `sessionHandler.handleSessionExpiry()` stores `window.location.pathname` in `localStorage` under `redirect_after_auth`.
3. User lands on `/` and reconnects their wallet.
4. Post-auth, `getPostAuthRedirect()` reads and clears `redirect_after_auth`, then navigates the user back.

**No data loss**
- The redirect path is the page the user was on when the expiry was detected. If they were mid-flow on `/send`, they return to `/send` after re-auth.
- Form state (draft inputs) is not preserved — the user may need to re-enter data on the restored page.

---

## Non-intrusive placement

- The notification is a floating element that does **not** shift or block page content.
- Users can continue interacting with the page behind it.
- The action buttons are compact (`px-3 py-1.5 text-xs`) — they don't dominate the notification.
- On mobile the notification spans edge-to-edge (`left-4 right-4`) but is only ~140px tall.

## Accessibility

| Requirement | Implementation |
|---|---|
| Live region | `role="alert"` with `aria-live="assertive"` — announced immediately by screen readers |
| Focus management | `useEffect` focuses the primary action button (`ref={primaryActionRef}`) when phase changes |
| Dismissible | `X` button with `aria-label="Dismiss notification"` + `Escape` key handler |
| Touch targets | All buttons use `touch-target` (44×44px) or `touch-target-wide` (44×88px min) |
| Colour contrast | Status tokens from tailwind config provide AA-compliant contrast against dark backgrounds |

## Integration guide

### Triggering the warning

Call `sessionHandler.dispatchSessionExpiring(countdownInSeconds, customMessage?)` from:
- An idle-detection timer in the provider
- A server-sent event handler
- A polling interval that checks session age

### Handling "Stay signed in"

Listen for the `session-refresh` custom event in your provider and call the session refresh API:

```typescript
window.addEventListener('session-refresh', async () => {
  await fetch('/api/auth/refresh', { method: 'POST' });
});
```

The built-in `useSessionExpiry` hook already resets the warning on this event.

### Wiring the provider in layout

```typescript
// app/layout.tsx
import SessionExpiryProvider from '@/components/SessionExpiryProvider';

<SessionExpiryProvider>
  {children}
</SessionExpiryProvider>
```

## Responsive behaviour

| Viewport | Notification style |
|---|---|
| < 640px (mobile) | Full-width bar, `left-4 right-4 top-4`, slide-in-bottom |
| >= 640px (tablet+) | Fixed card, `right-4 top-4`, `sm:max-w-sm`, slide-in-right |

## Copy decisions

- **"Session expiring"** (title) — present continuous signals an imminent event; clearer than "Session about to expire".
- **"For your security, you will be signed out automatically"** — explains *why* without alarming.
- **"Stay signed in"** (button) — active voice, positive framing; more inviting than "Extend session".
- **"Session expired"** (title) — past tense, definitive.
- **"Reconnect wallet"** (button) — matches the app's wallet-connection vocabulary; more specific than "Sign in again".
- Countdown uses MM:SS format — familiar and precise at a glance.
