# Cache Strategy Guide

Audience: contributors adding or reviewing data fetching, caching, and invalidation logic.

Use this guide when deciding between SWR-style patterns, RTK-Query patterns, or the current custom caching approach. The repository currently uses custom in-memory caches with SWR-like semantics; this document explains the existing patterns and provides decision rules for when to introduce dedicated libraries.

## Current State

The codebase does **not** currently use SWR or RTK-Query as direct dependencies. Instead, it implements custom caching patterns that mirror SWR semantics:

- **Server-side in-memory caches** with TTL-based freshness (e.g., `lib/anchor/rates-cache.ts`)
- **Client-side React Context providers** for shared state (e.g., `lib/context/RatesContext.tsx`)
- **Central cache registry** for coordinated invalidation (`lib/cache/registry.ts`)

Per [`docs/STATE.md`](./STATE.md), if the project adds a server-state library, **TanStack Query is the expected default** because it is React-first and handles caching, deduplication, and invalidation directly.

## SWR-Style Patterns (Current Implementation)

### Server-Side SWR Pattern

The anchor rates endpoint implements a classic stale-while-revalidate pattern:

**Entry point:** `app/api/anchor/rates/route.ts`

```typescript
// Branch 1: cache is fresh — serve immediately without a network call.
if (isCacheFresh()) {
    const rateCache = getAnchorRatesCache();
    return NextResponse.json<RatesSuccessBody>({
        rates: rateCache.rates as ExchangeRate[],
        stale: false,
    });
}

// Branch 2: cache is expired — attempt revalidation from upstream.
try {
    const fetchedRates = await anchorClient.getExchangeRates();
    setAnchorRatesCache(fetchedRates, Date.now());
    return NextResponse.json<RatesSuccessBody>({
        rates: fetchedRates,
        stale: false,
    });
} catch (error) {
    // Branch 3: upstream failed but we have stale data — serve it with a flag.
    if (isCacheStale()) {
        const rateCache = getAnchorRatesCache();
        return NextResponse.json<RatesSuccessBody>({
            rates: rateCache.rates as ExchangeRate[],
            stale: true,
        });
    }

    // Branch 4: no cached data at all — surface a typed error.
    return NextResponse.json<RatesErrorBody>(
        { error: 'Service Unavailable', code: 'UPSTREAM_UNAVAILABLE' },
        { status: 503 },
    );
}
```

**Key characteristics:**

- **TTL-based freshness:** Cache is fresh for 5 minutes (`RATES_CACHE_TTL_MS` in `lib/anchor/rates-cache.ts`)
- **Graceful degradation:** Returns stale data with a `stale: true` flag when upstream fails
- **Typed error path:** Returns `503` with a structured error body when no cache exists
- **No network call when fresh:** Immediate response from in-memory cache

**When to use this pattern:**

- Data that can tolerate slight staleness (exchange rates, reference data)
- Upstream services that may experience transient outages
- Read-heavy endpoints where response time matters more than absolute freshness

### Client-Side Context Cache Pattern

The `RatesProvider` implements a client-side cache with TTL and request deduplication:

**Entry point:** `lib/context/RatesContext.tsx`

```typescript
export const CLIENT_RATES_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function RatesProvider({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastFetchedAt = useRef<number>(0);
  const inflightRef = useRef<Promise<void> | null>(null);

  const fetchRates = useCallback(async (force = false) => {
    const isFresh = lastFetchedAt.current > 0 && 
                   (Date.now() - lastFetchedAt.current) < CLIENT_RATES_TTL_MS;
    if (!force && isFresh) return;

    // Share an in-flight request
    if (inflightRef.current) return inflightRef.current;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get("/api/anchor/rates");
        if (!res || !res.ok) {
          throw new Error(`HTTP ${res?.status ?? "error"}`);
        }
        const data: { rates: ExchangeRate[]; stale: boolean } = await res.json();
        setRates(data.rates ?? []);
        setStale(data.stale ?? false);
        lastFetchedAt.current = Date.now();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
        inflightRef.current = null;
      }
    };

    inflightRef.current = run();
    return inflightRef.current;
  }, []);

  useEffect(() => {
    fetchRates();
    const id = setInterval(() => fetchRates(), CLIENT_RATES_TTL_MS);
    return () => clearInterval(id);
  }, [fetchRates]);

  const refresh = useCallback(() => fetchRates(true), [fetchRates]);

  return (
    <RatesContext.Provider value={{ rates, loading, stale, error, refresh }}>
      {children}
    </RatesContext.Provider>
  );
}
```

**Key characteristics:**

- **Request deduplication:** Concurrent callers share a single in-flight request via `inflightRef`
- **TTL-based cache:** Client-side TTL (2 minutes) is shorter than server TTL (5 minutes) to revalidate proactively
- **Manual refresh:** `refresh()` forces a fresh fetch, ignoring TTL
- **Periodic revalidation:** `setInterval` refreshes data every TTL cycle

**When to use this pattern:**

- Data shared across multiple components in a route subtree
- When you need manual refresh control (pull-to-refresh, retry buttons)
- Small number of consumers (Context rerenders all consumers on change)

## Cache Key Conventions

### Server-Side Cache Keys

Server-side caches use **string identifiers** registered in the central cache registry:

**Entry point:** `lib/cache/registry.ts`

```typescript
// Register a cache with a unique name
registerCache('anchor_rates', clearAnchorRatesCache);
registerCache('contract_cache', clearCache);
```

**Key naming rules:**

- Use `snake_case` for cache names (e.g., `anchor_rates`, `contract_cache`)
- Names should be **descriptive and specific** to the data domain
- Avoid generic names like `cache` or `data`
- Prefix with the subsystem when multiple caches exist in the same domain

**Examples from the codebase:**

- `anchor_rates` — Exchange rates from the Anchor API
- `contract_cache` — Cached Soroban contract data

### Client-Side Cache Keys

Client-side Context providers use **React Context identity** rather than string keys. The "key" is the Context itself:

```typescript
// The Context itself serves as the key
const RatesContext = createContext<RatesState | null>(null);

// Consumers access data via the hook
export function useExchangeRates(): RatesState {
  const ctx = useContext(RatesContext);
  if (!ctx) throw new Error("useExchangeRates must be used within a RatesProvider");
  return ctx;
}
```

**When migrating to TanStack Query**, adopt its cache key conventions:

```typescript
// Array-style keys for hierarchical data
useQuery({ queryKey: ['anchor', 'rates'] })

// Object-style keys for parameterized queries
useQuery({ 
  queryKey: ['bills', { status: 'unpaid', limit: 20 }] 
})

// Function keys for complex derivation
useQuery({ 
  queryKey: ['transactions', userId, { from, to }] 
})
```

## Invalidation Strategies

### Centralized Cache Clearing

The cache registry provides **bulk and selective invalidation**:

**Entry point:** `lib/cache/registry.ts`

```typescript
// Clear all registered caches
const cleared = await clearRegisteredCaches();
console.log('Cleared caches:', cleared);
// Output: ['anchor_rates', 'contract_cache']

// Clear a specific cache by name
const ok = await invalidateCache('anchor_rates');
if (!ok) console.warn('No cache named anchor_rates');
```

**Admin endpoint:** `POST /api/admin/cache/clear`

This endpoint calls `clearRegisteredCaches()` and is protected by `ADMIN_SECRET`. Use it for:

- Emergency cache clearing during incidents
- Post-deployment cache invalidation
- Manual cache resets during debugging

### Manual Cache Clearing

Individual caches expose their own clear functions:

```typescript
// From lib/anchor/rates-cache.ts
export function clearAnchorRatesCache(): void {
  rateCache = { ...initialState };
}
```

**When to use manual clearing:**

- After a data migration that changes the shape of cached data
- When you know a specific cache is corrupted or out of sync
- In tests to ensure isolation between test cases

### Client-Side Invalidation

Context-based caches use **manual refresh** for invalidation:

```typescript
const { refresh } = useExchangeRates();

// Force a fresh fetch, ignoring TTL
refresh();
```

**When migrating to TanStack Query**, use its invalidation API:

```typescript
// Invalidate by query key
queryClient.invalidateQueries({ queryKey: ['anchor', 'rates'] });

// Invalidate all queries matching a filter
queryClient.invalidateQueries({ 
  predicate: (query) => query.queryKey[0] === 'bills' 
});

// Invalidate and refetch immediately
queryClient.invalidateQueries({ 
  queryKey: ['transactions'],
  refetchType: 'active'
});
```

## When to Use SWR vs RTK-Query

### Decision Framework

| Factor | SWR (or TanStack Query) | RTK-Query |
|--------|------------------------|-----------|
| **Primary use case** | React-focused data fetching | Redux-integrated data fetching |
| **Existing state management** | None or Zustand | Already using Redux Toolkit |
| **Cache strategy** | SWR semantics (stale-while-revalidate) | Normalized cache with tags |
| **Learning curve** | Lower (React hooks only) | Higher (Redux concepts required) |
| **Bundle size** | Smaller (~13KB) | Larger (~50KB with Redux) |
| **Server integration** | Works with any fetcher | Works with any fetcher |

### Use SWR or TanStack Query When:

- You need **React-first** data fetching with minimal boilerplate
- The app does **not already use Redux**
- You want **SWR semantics** (stale-while-revalidate, background refetch)
- You prefer **hook-based** APIs over Redux patterns
- Bundle size is a concern

**Example migration path for RatesContext:**

```typescript
// Before: Custom Context
const { rates, loading, stale, error, refresh } = useExchangeRates();

// After: TanStack Query
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['anchor', 'rates'],
  queryFn: async () => {
    const res = await apiClient.get('/api/anchor/rates');
    if (!res?.ok) throw new Error('Failed to fetch rates');
    const data = await res.json();
    return data.rates;
  },
  staleTime: 2 * 60 * 1000, // 2 minutes
  refetchInterval: 2 * 60 * 1000, // Poll every 2 minutes
});
```

### Use RTK-Query When:

- The app **already uses Redux Toolkit** for state management
- You need **normalized caching** with automatic entity updates
- You want **tag-based invalidation** (e.g., invalidate all queries tagged `user`)
- You prefer **centralized API slice** definitions
- You need **optimistic updates** with rollback support

**Example RTK-Query pattern:**

```typescript
// apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ 
    baseUrl: '/api/',
    prepareHeaders: (headers) => {
      // Add auth headers
      return headers;
    },
  }),
  tagTypes: ['Bills', 'Goals', 'Transactions'],
  endpoints: (builder) => ({
    getBills: builder.query<Bill[], void>({
      query: () => 'bills',
      providesTags: ['Bills'],
    }),
    createBill: builder.mutation<Bill, Partial<Bill>>({
      query: (body) => ({
        url: 'bills',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Bills'],
    }),
  }),
});

export const { useGetBillsQuery, useCreateBillMutation } = api;
```

## Migration Path from Custom Caches

### Step 1: Identify Candidates

Look for these patterns in the codebase:

- Context providers with TTL-based caching (e.g., `RatesContext`)
- Server-side caches with `isCacheFresh()` / `isCacheStale()` checks
- Multiple components fetching the same data independently
- Manual request deduplication logic

### Step 2: Choose a Library

Based on the decision framework above:

- **No Redux?** → TanStack Query (recommended in STATE.md)
- **Already using Redux?** → RTK-Query
- **Minimal needs?** → Keep custom cache (don't add dependency)

### Step 3: Migrate Incrementally

1. **Install the library** and add the root provider to `components/Providers.tsx`
2. **Migrate one cache at a time** (start with the simplest, e.g., `RatesContext`)
3. **Keep the old cache alongside** during migration to enable rollback
4. **Update tests** to assert on the new library's behavior
5. **Remove the old cache** once all consumers are migrated

### Step 4: Update Documentation

- Update this document with the new library's patterns
- Update `docs/STATE.md` to reflect the new state management approach
- Add examples to `docs/client-api.md` if the library integrates with `apiClient`

## Cache Invalidation Triggers

### Common Invalidation Scenarios

| Scenario | Invalidation Strategy |
|----------|----------------------|
| User creates a resource | Invalidate list queries for that resource type |
| User updates a resource | Invalidate specific resource query and list queries |
| User deletes a resource | Invalidate specific resource query and list queries |
| Admin updates reference data | Call `POST /api/admin/cache/clear` or specific cache invalidation |
| Time-based expiry | Rely on TTL or configure `staleTime` / `refetchInterval` |
| Window focus | Configure `refetchOnWindowFocus` (TanStack Query default: true) |
| Network reconnection | Configure `refetchOnReconnect` (TanStack Query default: true) |

### Example: Bill Payment Invalidation

**Current approach (custom cache):**

```typescript
// After creating a bill, manually refresh the bills list
const { refreshBills } = useBillsContext();
await createBill(payload);
refreshBills(); // Manual invalidation
```

**With TanStack Query:**

```typescript
const createBillMutation = useMutation({
  mutationFn: (payload) => apiClient.post('/api/bills', { body: JSON.stringify(payload) }),
  onSuccess: () => {
    // Automatically invalidate bills queries
    queryClient.invalidateQueries({ queryKey: ['bills'] });
  },
});
```

**With RTK-Query:**

```typescript
// Tag-based invalidation is automatic
const [createBill, { isLoading }] = useCreateBillMutation();
// The mutation invalidates ['Bills'] tag automatically
```

## Testing Cache Behavior

### Server-Side Cache Tests

Test the four SWR branches explicitly:

```typescript
// tests/unit/anchor/rates-cache.test.ts
describe('anchor rates cache', () => {
  it('serves fresh cache immediately', async () => {
    setAnchorRatesCache(mockRates, Date.now());
    const res = await GET(request);
    expect(await res.json()).toEqual({ rates: mockRates, stale: false });
  });

  it('revalidates expired cache', async () => {
    setAnchorRatesCache(mockRates, Date.now() - RATES_CACHE_TTL_MS - 1);
    const res = await GET(request);
    expect(await res.json()).toEqual({ rates: freshRates, stale: false });
  });

  it('returns stale data on upstream failure', async () => {
    setAnchorRatesCache(mockRates, Date.now() - RATES_CACHE_TTL_MS - 1);
    // Mock upstream failure
    const res = await GET(request);
    expect(await res.json()).toEqual({ rates: mockRates, stale: true });
  });

  it('returns 503 when no cache exists', async () => {
    clearAnchorRatesCache();
    // Mock upstream failure
    const res = await GET(request);
    expect(res.status).toBe(503);
  });
});
```

### Client-Side Cache Tests

Test request deduplication and TTL behavior:

```typescript
// tests/unit/context/RatesContext.test.tsx
describe('RatesProvider', () => {
  it('dedupes concurrent requests', async () => {
    const { result } = renderHook(() => useExchangeRates(), {
      wrapper: RatesProvider,
    });
    
    // Multiple components mount simultaneously
    const { rerender } = renderHook(() => useExchangeRates(), {
      wrapper: RatesProvider,
    });
    
    // Should only trigger one network request
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('respects TTL and skips fetch when fresh', async () => {
    // ... set up fresh cache
    const { result } = renderHook(() => useExchangeRates(), {
      wrapper: RatesProvider,
    });
    
    // Within TTL window
    act(() => {
      result.current.refresh();
    });
    
    // Should not fetch if within TTL
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
```

## Performance Considerations

### Memory Usage

- **Server-side caches** are in-memory and reset on server restart (or deployment)
- **Client-side caches** live in the browser and are cleared on page refresh
- **TanStack Query** has configurable cache limits (default: 5MB, 100 queries)

### Network Efficiency

- **Request deduplication** is critical for data fetched by multiple components
- **Background refetch** should respect rate limits (configure `refetchInterval` carefully)
- **Stale-while-revalidate** reduces perceived latency by serving stale data immediately

### Cache Sizing

Choose TTL based on data characteristics:

| Data type | Recommended TTL | Rationale |
|-----------|-----------------|-----------|
| Exchange rates | 2-5 minutes | Prices change frequently but slight staleness is acceptable |
| User preferences | 1 hour | Rarely change, can tolerate longer staleness |
| Transaction history | 30 seconds | Users expect near real-time updates |
| Reference data (countries, currencies) | 24 hours | Very stable, can cache aggressively |

## Related Documentation

- [`docs/STATE.md`](./STATE.md) — State management decision rules
- [`docs/client-api.md`](./client-api.md) — Client API layer and `apiClient` usage
- [`docs/architecture.md`](./architecture.md) — Overall system architecture
- [`lib/cache/registry.ts`](../lib/cache/registry.ts) — Central cache registry implementation
- [`lib/anchor/rates-cache.ts`](../lib/anchor/rates-cache.ts) — Server-side SWR example
- [`lib/context/RatesContext.tsx`](../lib/context/RatesContext.tsx) — Client-side cache example
