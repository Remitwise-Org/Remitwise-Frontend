# State Guide

Audience: contributors adding or reviewing client-side state.

Use this guide when deciding whether state belongs in component state, React
Context, Zustand, or a server-state library. The default in this repository is
local component state plus small React Context providers. Zustand and a
server-state library are not direct dependencies today; add either only when the
decision rules below justify the extra dependency and the PR includes provider
setup, tests, and documentation updates.

Related entry points:

- `components/Providers.tsx` wires global client providers under the root
  layout.
- `lib/context/` contains shared client state providers.
- `lib/client/apiClient.ts` is the client-side request wrapper for authenticated
  API calls.
- `app/api/` owns server data and persistence boundaries.

## Decision Rules

| State shape | Use | Do not use |
| --- | --- | --- |
| One component owns the value and its children only receive callbacks or props | `useState`, `useReducer`, or a custom hook colocated with that component | Context or a global store |
| Small app-wide UI preferences or actions | React Context in `lib/context/`, mounted from `components/Providers.tsx` | Zustand or a server-state library |
| Client-only state with many independent readers and writers, frequent updates, or selector-based reads | Zustand, added as a direct dependency in the same PR | Context that forces broad rerenders |
| Data fetched from API routes, contracts, or Prisma-backed routes | Server components, route handlers, current `apiClient` patterns, or a server-state library when caching/revalidation becomes shared | Context or Zustand as a network cache |

## Use Local Component State First

Keep state local when it describes a single route step, form, modal, or widget.
For example, `app/dashboard/page.tsx` owns the dashboard loading state because it
is only needed by that page:

```tsx
const [state, setState] = useState<LoadState>("loading");
const [data, setData] = useState<DashboardResponse | null>(null);

const load = useCallback(async () => {
  setState("loading");
  const res = await apiClient.get("/api/dashboard");
  if (!res || !res.ok) {
    setState("error");
    return;
  }
  setData((await res.json()) as DashboardResponse);
  setState("ready");
}, []);
```

Choose this pattern when:

- The state resets naturally when the route or component unmounts.
- Only one component needs to write the value.
- Passing the value down one or two levels is still readable.

## Use React Context For Small Shared UI State

Use Context when descendants need the same client-only value or command and the
update rate is low. Existing examples are `ToastProvider`, `DensityProvider`,
and `AsyncOperationsProvider`.

New Context providers belong in `lib/context/` and should be mounted in
`components/Providers.tsx` only when they are truly global. Feature-scoped
providers can be mounted closer to their route.

```tsx
// components/Providers.tsx
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <ToastProvider>
        <DensityProvider>
          <AsyncOperationsProvider>{children}</AsyncOperationsProvider>
        </DensityProvider>
      </ToastProvider>
    </WalletProvider>
  );
}
```

Context is the right fit for:

- A command API such as `useToast().toast(...)`.
- A user preference such as display density.
- A small queue of client-only UI operations.
- State whose provider boundary is part of the UI contract.

Avoid Context when consumers need unrelated slices of a large object. Every
provider value change can rerender every consumer, so split providers by concern
before adding a broad "app state" context.

## Use Zustand For Client-Only Domain UI State

Reach for Zustand when Context starts to act like a store: many components read
different slices, multiple distant components write to it, or updates are
frequent enough that Context rerenders become visible.

Good candidates:

- A multi-panel transaction builder where summary, review, validation, and
  footer actions all need independent slices.
- A command palette or workspace UI with selected item, filters, keyboard state,
  and open panels that change often.
- Optimistic client-only workflow state that is not the source of truth on the
  server.

Do not put API response caching in Zustand. If the value came from an API route
and needs freshness, invalidation, retry, or deduplication, use a server-state
approach instead.

If a PR introduces Zustand, make it a direct dependency and keep the store
feature-scoped unless there is a proven global need. A realistic first candidate
would be a future send-flow store for `app/send/page.tsx` if recipient, amount,
review, footer actions, and split preview all need independent subscriptions to
the same draft transaction.

Review checklist for a new Zustand store:

- The package is listed in `package.json`, not only present transitively in a
  lockfile.
- Components select only the fields they need.
- Server-owned data is stored as IDs or draft input, not as a replacement cache.
- Tests cover store transitions without rendering the full app when possible.

## Use A Server-State Library For Shared Remote Data

Use a server-state library when multiple client surfaces fetch the same remote
data and need cache keys, request deduplication, background refresh, mutation
invalidation, retries, or optimistic updates. TanStack Query is the expected
default if the project adds a server-state library because it is React-first and
handles these behaviours directly.

Good candidates:

- `/api/dashboard` or `/api/insights` data reused by multiple dashboard widgets.
- `/api/anchor/rates` if several routes need the same exchange-rate cache and
  stale state.
- Lists with mutations, such as bills, savings goals, family members, or
  insurance policies.

The current `RatesProvider` is an intentionally small Context-based cache for
`/api/anchor/rates`. Keep it while exchange rates have only a few consumers. If
the same fetch/retry/stale logic spreads to other endpoints, migrate shared
remote data to a server-state library instead of cloning provider caches.

If a PR introduces a server-state library, it must also add the root provider in
`components/Providers.tsx`, document the cache key convention here, and update
tests for loading, error, success, and invalidation behaviour. Keep existing
`apiClient` behaviour in the fetcher so authenticated requests still use the
shared session-expiry handling.

## Pull Request Checklist

- Document which owner you chose: local state, Context, Zustand, or server-state
  library.
- Keep provider boundaries as narrow as possible.
- Do not mirror server-owned records into Context or Zustand just to avoid
  passing props.
- Use `apiClient` for authenticated client requests so session expiry continues
  to work.
- Add or update tests for state transitions that affect user-visible behaviour.
