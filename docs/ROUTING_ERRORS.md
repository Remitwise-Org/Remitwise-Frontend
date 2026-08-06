# Routing Errors — How They Surface to the User

> **Audience:** contributor. This doc explains the different ways a routing error can
> reach a user in the RemitWise UI, which file handles each case, and what the user
> actually sees. It is the routing-specific companion to
> [docs/error-handling.md](error-handling.md) (which covers the general error-boundary
> strategy).

## Why this matters

Routing errors are the most visible failure surface in any Next.js app: a user lands
on a URL that doesn't exist, a route fails to render, or a dynamic segment references
a record that was deleted. Each of these has a distinct, intentional UX. Knowing which
file owns which case prevents contributors from "fixing" a 404 by editing the wrong
component, or from accidentally shipping a raw stack trace to end users.

## The four routing-error surfaces

### 1. Unknown / unmatched URL → `app/not-found.tsx`

When a user navigates to a path that matches **no route** in the app, Next.js renders
`app/not-found.tsx` (the global 404 page).

- **File:** `app/not-found.tsx`
- **What the user sees:** a branded "404 – Page Not Found" badge, a "Lost in the
  transfer?" heading, links to the primary destinations (Dashboard, Send, Bills,
  Insurance, Family, Settings), and "Go to Home" / "Open Dashboard" CTAs.
- **Metadata:** `title: "Page Not Found – RemitWise"`, with a short description, is set
  for search engines and screen readers.
- **When it runs:** any unmatched top-level or nested path. It is the last-resort
  fallback for URLs that don't exist.

### 2. Route handler explicitly calls `notFound()` → `app/not-found.tsx`

Routes that look up a dynamic resource (e.g. `/receipt/[txHash]`) call Next's
`notFound()` from `next/navigation` when the resource is missing.

- **File(s):** `app/receipt/[txHash]/page.tsx`, `app/debug/page.tsx`
- **Behaviour:** `notFound()` throws a special `NEXT_NOT_FOUND` error that Next.js
  catches and forwards to the nearest `not-found` boundary — for the app shell that is
  `app/not-found.tsx`.
- **What the user sees:** the same branded 404 page as case 1, so a missing receipt
  and a mistyped URL are visually consistent.
- **Item-ID leak note:** the page sets a local `notFound` flag and only renders the 404
  UI — it does **not** echo the requested `txHash` back onto the page, so a failed
  lookup doesn't leak internal identifiers.

### 3. Client render failure → `app/error.tsx` → `RootErrorFallback`

When a route **exists** but throws while rendering on the client (outside a widget
boundary), Next.js renders the nearest `error.tsx`.

- **File:** `app/error.tsx` (root) → `components/RootErrorFallback.tsx`
- **Pipeline:**
  1. `app/error.tsx` reports the exception to Sentry via
     `errorReporter.captureException(error)` (PII scrubbed).
  2. It renders `RootErrorFallback`, passing the `reset` callback.
  3. `RootErrorFallback` reads the current `pathname` and picks a route-specific
     message from `lib/config/route-errors.ts`.
- **What the user sees:** a focused, per-route fallback (e.g. "Dashboard unavailable",
  "Transfer unavailable", "Transactions unavailable") with a retry button that calls
  `onReset` to remount the subtree from a clean React tree. The heading is focused on
  mount for screen-reader users.
- **Route messaging:** `lib/config/route-errors.ts` maps route prefixes to
  `{ titleKey, defaultTitle, descriptionKey, defaultDescription }`. Unknown paths fall
  back to `DEFAULT_ERROR_MESSAGE` ("Something went wrong" / "We hit an unexpected
  problem, but your session is still safe…").

### 4. API route hits a missing resource → HTTP 404 JSON

API routes return a **404 HTTP status** (not a rendered page) when a resource is
missing. The client then surfaces it via the shared `useFormAction` hook or `apiClient`.

- **File(s):** `app/api/bills/route.ts`, `app/api/bills/[id]/route.ts`
- **Pattern:** route handlers catch a `not-found` error and respond with a typed 404
  JSON body rather than a generic 500.
- **What the user sees:** the form/hook sets an error message near the relevant control
  (e.g. "Bill not found") instead of a generic "Request failed". See
  [docs/use-form-action.md](use-form-action.md) for the error-message pipeline.

## Choosing the right boundary

| Scenario | File to touch | User sees |
|:---|:---|:---|
| URL doesn't match any route | `app/not-found.tsx` | Branded 404 page |
| Dynamic route lookup fails | `notFound()` in the page → `app/not-found.tsx` | Branded 404 page |
| Route renders but throws on client | `app/error.tsx` + `RootErrorFallback` + `route-errors.ts` | Per-route fallback + retry |
| API call for a missing record | API route handler → 404 JSON | Inline field error via `useFormAction` |

## Cross-links

- [docs/error-handling.md](error-handling.md) — general boundary strategy and the
  `FeatureBoundary` / `WidgetErrorBoundary` wrappers.
- [docs/use-form-action.md](use-form-action.md) — how client-side API errors surface in
  forms.
- [docs/session-expiry-design.md](session-expiry-design.md) — the related session-expiry
  redirect flow.