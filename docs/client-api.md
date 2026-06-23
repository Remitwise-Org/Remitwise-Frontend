# Client API Layer

This is the canonical guide for the browser-side API layer in RemitWise.

Use it when you are adding or reviewing client code that talks to `/api/*`. The goal is simple: authenticated browser requests should go through the shared client helpers so session refresh, expiry handling, and logout stay consistent across the app.

## At a Glance

Use [`apiClient`](../lib/client/apiClient.ts) for authenticated browser requests to RemitWise API routes.

Use raw `fetch` only when one of these is true:

- The request is public and does not need session expiry handling.
- The code runs on the server, in a route handler, or in a server action.
- You are calling a third-party service rather than the app's own API routes.
- You intentionally do not want the shared retry and `401 -> refresh -> retry once` behavior.

Related modules:

- [`lib/client/apiClient.ts`](../lib/client/apiClient.ts): shared request wrapper.
- [`lib/client/sessionHandler.ts`](../lib/client/sessionHandler.ts): session-expiry detection, refresh, and redirect flow.
- [`lib/client/useSessionExpiry.ts`](../lib/client/useSessionExpiry.ts): hook that turns window events into UI state.
- [`components/SessionExpiryProvider.tsx`](../components/SessionExpiryProvider.tsx): mounts the notification globally.
- [`lib/client/logout.ts`](../lib/client/logout.ts): logout helper and post-auth redirect helper.

Real call sites in the repo:

- [`app/send/page.tsx`](../app/send/page.tsx): authenticated `POST` with `null` handling and API error handling.
- [`app/bills/page.tsx`](../app/bills/page.tsx): parallel authenticated `GET` requests.
- [`lib/hooks/useFormAction.ts`](../lib/hooks/useFormAction.ts): generic form submission wrapper.
- [`components/WalletButton.tsx`](../components/WalletButton.tsx) and [`components/Nav/MobileNav.tsx`](../components/Nav/MobileNav.tsx): logout entry points.
- [`app/layout.tsx`](../app/layout.tsx): global `SessionExpiryProvider` mount point.

## `apiClient` Contract

`apiClient` exposes:

- `apiClient.request(url, options?)`
- `apiClient.get(url, options?)`
- `apiClient.head(url, options?)`
- `apiClient.post(url, options?)`
- `apiClient.put(url, options?)`
- `apiClient.patch(url, options?)`
- `apiClient.delete(url, options?)`
- `apiClient.getJson<T>(url, options?)`

`ApiClientOptions` extends `RequestInit` and adds:

- `retries?: number` — max retry attempts for idempotent (`GET`/`HEAD`) requests. Default `3`. Ignored for writes.
- `backoff?: number` — base backoff in ms; doubles each attempt and is jittered. Default `1000`.
- `timeout?: number` — per-request timeout in ms before the request is aborted. Default `10000`. Pass `0` to disable.

Return type:

- `Promise<Response | null>` for the verb helpers and `request`.
- `Promise<T | null>` for `getJson<T>` (parsed/validated body, or `null` on session expiry).

Interpret the result like this:

- `Response`: the request completed and did not enter the terminal session-expiry flow.
- `null`: the session-expiry flow already ran, local auth state was cleared, and the UI was notified and scheduled for redirect. Callers should stop work and not show a duplicate auth error.

### Timeout

Every request (regardless of method) runs under a per-request timeout enforced
with an `AbortController`. The default is `10000` ms and is configurable via the
`timeout` option (`0` disables it). When the timeout fires, the in-flight fetch
is aborted. For idempotent requests this counts as a retryable failure; once
retries are exhausted (or for writes) the call rejects with a `TimeoutError`
`DOMException`.

The timeout is composed with any caller-supplied `signal`, so a component
unmount or `useFormAction`'s latest-wins abort still cancels the request
immediately (see [Aborting requests](#aborting-requests)).

### Retry Behavior

Before session-expiry logic runs, `apiClient` uses `fetchWithRetry`.

Defaults:

- `retries = 3` (idempotent methods only)
- `backoff = 1000`
- `timeout = 10000`

Automatic retries happen **only for idempotent methods (`GET` and `HEAD`)**, on:

- HTTP `5xx`
- HTTP `429`
- Rejected fetches such as network failures and timeouts

Write methods (`POST`, `PUT`, `PATCH`, `DELETE`) are **never** auto-retried, even
on `5xx`/`429`/network errors. This is deliberate: replaying a write could cause
a double-submit (e.g. sending a remittance twice). Writes still get a timeout;
they just fail fast instead of retrying.

Backoff is exponential with jitter: the delay for each retry is
`base * 2^attempt`, of which half is fixed and half is randomized ("equal
jitter") so many clients don't reconverge on the server. When a response carries
a `Retry-After` header (e.g. on `429`), that value is honored instead of the
computed backoff (clamped to 30s).

A caller-initiated abort is never retried — it rejects immediately.

Responses such as `400`, `403`, and non-expiry `401` values are returned to the
caller without this retry loop treating them as session failures.

> Note: this is the **browser** client. Do not confuse it with the server-side
> RPC retry in [`lib/soroban/client.ts`](../lib/soroban/client.ts); the two layers
> are independent and should not be stacked on the same call path.

### Typed reads with `getJson<T>()`

`getJson<T>(url, options?)` is a convenience wrapper over `get` for JSON reads:

1. Sends an idempotent `GET` (with the shared timeout + retry behavior).
2. Returns `null` if the session-expiry flow ran.
3. Throws `ApiClientError` if the response is not OK or the body is not valid JSON.
4. Optionally runs a `validate(data) => T` function (e.g. a Zod schema's `parse`)
   and returns the typed, validated result.

```ts
import { apiClient, ApiClientError } from '@/lib/client/apiClient';

const insights = await apiClient.getJson('/api/insights', {
  validate: (raw) => InsightsSchema.parse(raw),
});

if (insights === null) return; // session-expiry flow already handled
// insights is typed and validated here
```

## `401 -> refresh -> retry once`

For authenticated browser requests, the session flow is:

1. `apiClient` sends the request.
2. If the final response is not a session-expiry response, it is returned unchanged.
3. `sessionHandler.isSessionExpired()` treats a response as expired only when:
   - `status === 401`
   - the JSON body contains `message === "Session expired"`
4. On the first expired response, `apiClient` calls `sessionHandler.refreshSession()`.
5. `refreshSession()` sends `POST /api/auth/refresh`.
6. If refresh succeeds, `apiClient` replays the original request once.
7. If refresh fails, or the replayed request is still an expired-session `401`, `sessionHandler.handleSessionExpiry()` runs and `apiClient` returns `null`.

Important details:

- Retry-once semantics are enforced with an internal `_isRetry` flag. The original request is replayed at most once after refresh.
- Concurrent `401` responses share one in-flight refresh request. `sessionHandler.refreshSession()` memoizes the active refresh promise so only one `/api/auth/refresh` call is made at a time.
- Each waiting request still retries its own original request once after the shared refresh resolves successfully.
- Refresh failure does not call the `logout()` helper. It runs the session-expiry handler directly, which clears local client auth state, emits the expiry event, stores a post-auth redirect path, and schedules a redirect to `/`.

## Error Shape and Caller Responsibilities

`apiClient` does not parse JSON or normalize error payloads for you. It returns the raw `Response` so callers should handle three cases:

1. `response === null`
   The session-expiry flow already started. Do not show a duplicate "please log in" error.
2. `!response.ok`
   The request reached the API, but the route returned an error status. Parse the body and surface the route-specific error.
3. `catch (error)`
   Fetch rejected after retries were exhausted, usually due to network failure or another transport-level error.

Pattern used in [`app/send/page.tsx`](../app/send/page.tsx):

```ts
try {
  const response = await apiClient.post('/api/send', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient, amount, currency }),
  });

  if (response === null) return;

  const data = await response.json();

  if (!response.ok || !data.success) {
    // Show API-level error from route
    return;
  }

  // Success path
} catch {
  // Show network / transport error
}
```

## Copy-Paste Examples

### GET request

```ts
import { apiClient } from '@/lib/client/apiClient';

export async function loadBills() {
  try {
    const response = await apiClient.get('/api/bills');

    if (response === null) return null;
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.message || 'Failed to load bills');
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Network error while loading bills'
    );
  }
}
```

### POST request

```ts
import { apiClient } from '@/lib/client/apiClient';

export async function createGoal(payload: { name: string; targetAmount: number }) {
  try {
    const response = await apiClient.post('/api/goals', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response === null) return { kind: 'session-expired' as const };

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        kind: 'api-error' as const,
        message: data?.message || 'Unable to create goal',
      };
    }

    return { kind: 'success' as const, data };
  } catch {
    return {
      kind: 'network-error' as const,
      message: 'Network error. Please try again.',
    };
  }
}
```

### Parallel authenticated GETs

Pattern used in [`app/bills/page.tsx`](../app/bills/page.tsx):

```ts
const [billsRes, statsRes] = await Promise.all([
  apiClient.get('/api/bills'),
  apiClient.get('/api/bills/total-unpaid'),
]);

if (!billsRes || !statsRes) return;
if (!billsRes.ok || !statsRes.ok) {
  throw new Error('Failed to load bills data');
}
```

## Session Expiry UI

The UI side of expiry handling is event-driven.

### Provider and Notification

[`app/layout.tsx`](../app/layout.tsx) mounts [`components/SessionExpiryProvider.tsx`](../components/SessionExpiryProvider.tsx) near the top of the client tree.

The provider:

- calls `useSessionExpiry()`
- renders [`components/SessionExpiryNotification.tsx`](../components/SessionExpiryNotification.tsx)
- passes through the current phase, message, countdown, and actions

The notification has two phases:

- `warning`
- `expired`

### Events and Hook Behavior

`useSessionExpiry()` listens for three window events:

- `session-expiring`
- `session-expired`
- `session-refresh`

Behavior by event:

- `session-expiring`
  Sets `phase` to `warning`, shows the message, and starts a one-second countdown.
- `session-expired`
  Sets `phase` to `expired` immediately and stops any active countdown.
- `session-refresh`
  Clears the local warning/expired UI state.

Current contract to know:

- `staySignedIn()` dispatches `session-refresh` and resets the local notification state.
- In the current codebase, the hook/provider do not themselves call `/api/auth/refresh` when that event fires.
- The automatic refresh request currently happens in `apiClient` after an expired-session `401`, not in the proactive warning UI path.

So if you add proactive "session about to expire" server support, you must also add a listener that turns the warning-phase `session-refresh` event into a real refresh request.

### User-facing flow

Expired flow:

1. An authenticated request returns `401` with `message: "Session expired"`.
2. `apiClient` attempts one refresh.
3. If refresh cannot recover the request, `sessionHandler.handleSessionExpiry()` clears local auth state.
4. `handleSessionExpiry()` stores `redirect_after_auth` when the current path is not `/`.
5. It dispatches `session-expired`.
6. The provider shows the expired notification.
7. A redirect to `/` is scheduled after 15 seconds.

Warning flow:

1. Some caller dispatches `session-expiring`, usually through `sessionHandler.dispatchSessionExpiring(countdown, message)`.
2. The provider shows the warning notification and countdown.
3. Clicking "Stay signed in" clears the notification state locally by dispatching `session-refresh`.
4. If the countdown reaches zero first, the hook transitions the UI into the expired state.

## Logout and Post-Auth Redirects

`logout()` in [`lib/client/logout.ts`](../lib/client/logout.ts) is the explicit sign-out helper. It is used by the wallet/menu UI.

Contract:

1. `POST /api/auth/logout`
2. Clear local auth state with `sessionHandler.clearAuthState()` even if the request fails
3. Redirect with `window.location.href`, defaulting to `/`

`clearAuthState()` currently removes these localStorage keys:

- `wallet_address`
- `wallet_connected`
- `auth_state`

`handleSessionExpiry()` additionally stores:

- `redirect_after_auth`

Use `getPostAuthRedirect()` after a successful wallet reconnect or login to read and clear that stored path.

Example:

```ts
import { getPostAuthRedirect } from '@/lib/client/logout';

const redirectPath = getPostAuthRedirect();
router.push(redirectPath || '/dashboard');
```

## Edge Cases

### Refresh failure

If `/api/auth/refresh` fails or returns a non-OK status, `apiClient` does not retry the original request again. It runs `handleSessionExpiry()` and returns `null`.

### Retry-once semantics

The original request is replayed at most once after a successful refresh. A second expired-session `401` on the replay triggers the terminal expiry flow.

### Aborting requests

You can pass an `AbortSignal` through `ApiClientOptions` because the options extend `RequestInit`.

Current implementation detail:

- The caller's `signal` is combined with the internal per-request timeout signal,
  so either source can cancel the in-flight fetch.
- A caller-initiated abort fails fast: it is surfaced to the caller immediately
  and is **never** retried, regardless of `retries`.
- A timeout abort, by contrast, is treated as a retryable failure for idempotent
  `GET`/`HEAD` requests.

This makes `apiClient` safe to use with abort-on-unmount patterns such as
`useFormAction`, where the latest submit aborts the previous in-flight request.

### Concurrent `401`s

Multiple requests can discover an expired session at the same time. They share a single refresh attempt, but each request still replays itself once after that shared refresh succeeds.

## Contributor Checklist

Before opening a PR for client-side API work:

- Use `apiClient` for authenticated browser requests.
- Handle `null`, `!response.ok`, and thrown transport errors separately.
- Avoid page-specific session-expiry toasts or redirects when `apiClient` already owns that flow.
- Use `logout()` for explicit sign-out buttons.
- If you surface warning-phase expiry, make sure the provider path is wired for a real refresh request if that is part of your feature.
