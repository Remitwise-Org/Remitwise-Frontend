# Stale-Data Warning Banner

When a live fetch fails (network error, non-2xx response, or timeout), pages that
have previously loaded data now fall back to the last-good cached payload and
display an amber **stale-data banner** instead of showing an error screen. This
gives users something useful to look at while they wait for connectivity to recover,
and makes the failure mode far less disruptive for operators, support, and downstream
consumers.

---

## User-facing behaviour

| Scenario | Before | After |
|---|---|---|
| Network drops after first load | Full error state replaces the page | Cached data shown + amber banner at top |
| API returns 5xx | Full error state | Cached data shown + amber banner |
| No previous load / cache expired | Error state (unchanged) | Error state (no change) |
| Session expired (`null` from apiClient) | Error state (session-expiry UI) | Session-expiry UI (no change) |

The banner reads:

> **Showing cached data.** Live data could not be loaded. Last refreshed _X minutes ago_.

Two actions are available inside the banner:

- **Refresh** — triggers a new fetch immediately.
- **× (Dismiss)** — hides the banner while leaving the stale data visible. The
  banner reappears on the next failed fetch.

---

## Architecture

### `lib/hooks/useStaleFetch.ts`

A generic React hook that wraps `apiClient.get()` with an automatic sessionStorage
fallback.

```typescript
import { useStaleFetch } from '@/lib/hooks/useStaleFetch';

const { state, data, isStale, staleAt, load } = useStaleFetch<MyPayload>({
  url: '/api/my-endpoint',
  cacheKey: 'my-endpoint-cache',   // unique sessionStorage key
  maxStaleAgeMs: 5 * 60 * 1000,    // optional, default 5 minutes
});
```

**Returned values**

| Field | Type | Description |
|---|---|---|
| `state` | `'loading' \| 'stale' \| 'ready' \| 'error'` | Current fetch phase |
| `data` | `T \| null` | Fetched or stale-cached payload |
| `isStale` | `boolean` | `true` when `data` is from the cache, not a fresh fetch |
| `staleAt` | `number \| null` | `Date.now()` timestamp of when the cache was written |
| `load` | `() => void` | Trigger a fresh fetch |

**State machine**

```
'loading' ──success──► 'ready'   (isStale=false)
          ──failure + cache hit──► 'stale'   (isStale=true)
          ──failure + no cache──► 'error'   (isStale=false)
```

**Cache contract**

- Data is stored under `cacheKey` in `sessionStorage` as a JSON envelope:
  `{ data: T, cachedAt: number }`.
- On a successful fetch the envelope is overwritten with the latest payload.
- On a failed fetch the hook reads the envelope; if the entry exists and its age is
  ≤ `maxStaleAgeMs` it is served as stale data.
- `sessionStorage` is scoped to the browser tab and cleared when the tab closes, so
  stale data never persists across sessions.
- `sessionStorage` failures (quota exceeded, private browsing) are silently ignored;
  the hook falls through to the hard error state.
- Session-expiry (`null` return from `apiClient`) bypasses the stale fallback — the
  session-expiry UI takes over as before.

### `components/ui/StaleBanner.tsx`

A dismissible, accessible amber banner using only the `status.warning.*` design
tokens from `tailwind.config.js`.

```tsx
import { StaleBanner } from '@/components/ui/StaleBanner';

<StaleBanner
  staleAt={staleAt}       // timestamp for "last refreshed X ago" label
  onRefresh={load}        // called when user presses Refresh
  onDismiss={() => …}     // optional; omit to hide the dismiss button
  className="mb-4"        // optional additional Tailwind classes
/>
```

**Accessibility**

- `role="status"` + `aria-live="polite"` announces the banner to screen readers
  without interrupting ongoing announcements.
- The Refresh and Dismiss buttons each have an explicit `aria-label`.
- All interactive elements have visible focus rings using the project's
  `focus-visible:outline` pattern.

---

## Wired-up pages

| Page | Endpoint(s) | Cache key |
|---|---|---|
| `app/dashboard/page.tsx` | `GET /api/dashboard` | `dashboard-data` |
| `app/bills/page.tsx` | `GET /api/bills` + `GET /api/bills/total-unpaid` | `bills-data` |

### Adding stale support to a new page

**Option A — single endpoint** (use the hook):

```tsx
import { useStaleFetch } from '@/lib/hooks/useStaleFetch';
import { StaleBanner } from '@/components/ui/StaleBanner';

const { state, data, isStale, staleAt, load } = useStaleFetch<MyType>({
  url: '/api/my-route',
  cacheKey: 'my-route-data',
});

// In JSX:
{isStale && <StaleBanner staleAt={staleAt} onRefresh={load} onDismiss={…} />}
```

**Option B — multiple parallel endpoints** (manual pattern used in `bills/page.tsx`):

1. Write a `CACHE_KEY` constant and `readCache` / `writeCache` helpers.
2. In the `catch` block of your fetch, call `readCache()`. If a fresh-enough entry
   exists, set your data state and set `isStale = true`.
3. Render `<StaleBanner>` above your content when `isStale && !bannerDismissed`.

---

## Design tokens

The banner uses only values from `tailwind.config.js` under `theme.extend.colors.status.warning`:

| Token | Value | Usage |
|---|---|---|
| `status.warning.fg` | `#FDE68A` | Text and icon colour |
| `status.warning.bg` | `rgba(245,158,11,0.14)` | Background tint |
| `status.warning.border` | `rgba(245,158,11,0.28)` | Border tint |

Do not hard-code amber colour values. Reference the tokens above.

---

## FAQ

**Why `sessionStorage` and not React state or `localStorage`?**

`sessionStorage` persists across re-renders (survives a `useEffect` cleanup cycle)
but is automatically cleared when the tab closes. This gives meaningful resilience
for a single browsing session while ensuring stale data from a previous session is
never shown to a new session. `localStorage` would survive across sessions, which is
inappropriate for financial data.

**What happens when the user has never loaded the page before?**

`readCache` returns `null`, the hook falls through to the existing `'error'` state,
and the normal `WidgetErrorState` is shown — exactly as it was before this change.
There is no regression for first-time page loads.

**Is stale data shown for session-expiry failures?**

No. `apiClient.get()` returns `null` when the session-expiry flow has been triggered.
`useStaleFetch` checks for `null` first and transitions directly to `'error'`,
letting the session-expiry UI handle the redirect without interference.

**How long is stale data accepted?**

The default is 5 minutes (`DEFAULT_MAX_STALE_AGE_MS`). Pass `maxStaleAgeMs` to the
hook to override this per-page. Set `maxStaleAgeMs: 0` to accept any cached entry
regardless of age (not recommended for financial data).
