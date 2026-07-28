# Search UX

> **Audience:** Contributors adding, modifying, or reviewing search-related UI.
> **Goal:** Document the two distinct search patterns (instant debounce and URL-submit) and the recent-results mechanism so contributors can match existing behaviour without reading every commit.

## Overview

RemitWise uses two search patterns:

1. **Instant debounced search** -- filters a local dataset as the user types.
2. **URL-submit search** -- a dedicated page that reads its query from URL search params set by the command palette.

There is no toggle between these patterns; each surface uses one or the other based on its data model.

## Instant Debounced Search

### Where it appears

| Page | Input | Hook | File |
|------|-------|------|------|
| `/transactions` | Inline `<input type="search">` | `useDebounce(searchQuery, 300)` | `app/transactions/page.tsx:309` |
| `/dashboard/transaction-history` | `<TransactionHistorySearchInput>` | `useDebounce(searchTerm, 300)` | `app/dashboard/transaction-history/page.tsx:58` |
| Command palette | Inline `<input>` | None (synchronous `useMemo`) | `components/CommandPalette.tsx:222` |

### How it works

1. Every keystroke updates component state immediately via `onChange`.
2. `useDebounce(value, 300)` returns a derived value that updates only after 300 ms of inactivity.
3. A `useMemo` depends on the debounced value and re-runs the filter.
4. Empty queries disable filtering (all items shown).

### Filtering logic

Both transaction pages use case-insensitive `String.includes()` matching across multiple fields:

```ts
// app/transactions/page.tsx — fields matched:
["id", "counterpartyName", "type", "status", "amount", "currency"]

// app/dashboard/transaction-history/page.tsx — fields matched:
["hash", "recipient", "sender", "memo", "amount", "currency", "id"]
```

Search combines with type/status chip filters using AND logic (see [docs/transactions-filters-search-grouping.md](./transactions-filters-search-grouping.md) for the full truth table).

### Key implementation detail

No API call is made for the search itself. Both pages filter a locally-held dataset. If the dataset grows large enough to warrant server-side search, the debounce hook can stay in place -- only the filter `useMemo` would need to be replaced with an API call.

### Adding instant search to a new page

```tsx
"use client";

import { useDebounce } from "@/lib/hooks/useDebounce";

export default function MyPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const filtered = useMemo(
    () => items.filter((item) =>
      item.name.toLowerCase().includes(debouncedQuery.toLowerCase())
    ),
    [items, debouncedQuery]
  );

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

## URL-Submit Search (Global Search Page)

### Where it appears

| Surface | Entry point | File |
|---------|-------------|------|
| `/search?q=...` | Command palette "Global Search" route | `app/search/page.tsx` |

### How it works

1. User opens the command palette (`Cmd/Ctrl + K`) and types a query.
2. Selecting "Global Search" navigates to `/search?q={query}`.
3. The `/search` page is a **server component** that reads `q` from `searchParams`.
4. `getGlobalSearchResults()` in `lib/search/globalSearchCatalog.ts` performs case-insensitive `includes()` matching against a static catalog of ~6 items.

There is **no search input on the page itself** -- the query is set entirely by the URL.

### Key implementation detail

The catalog is a static array of `GlobalSearchResult` objects with `title`, `description`, `category`, and `keywords` fields. There is no fuzzy matching, no API integration, and no pagination. If the catalog grows, consider migrating to a client-side search library or an API-backed endpoint.

## Command Palette Filtering

The command palette (`components/CommandPalette.tsx`) filters its command list **instantly with no debounce**. This is intentional -- the command list is small enough that synchronous filtering feels responsive.

Special behavior: the "Global Search" route item only appears in the list when the user has typed something (i.e. `searchQuery.trim().length > 0`). When selected, it navigates to `/search?q={query}`.

## Recent Results (Command Palette)

### Where it appears

| Surface | Hook | Storage key | File |
|---------|------|-------------|------|
| Command palette (top section when empty) | `useRecentItems` | `remitwise_recent_commands` | `components/CommandPalette.tsx:29` |

### How it works

1. When the command palette opens with an empty search query, up to 5 recently executed commands appear under a "Recently Opened" section.
2. On command execution, the command ID is added to the front of the recent list via `addRecentCommandId(command.id)`.
3. `useRecentItems` deduplicates (moves repeated items to front) and caps at `maxItems` (5).
4. Persistence is via `localStorage` with `try/catch` error handling for environments where localStorage is unavailable.

### There are no recent search queries

The codebase does **not** persist search queries, cache search results, or display search history. The `useRecentItems` hook tracks recently *executed commands* only. If a "recent searches" feature is added in the future, the same `useRecentItems` hook can be reused with a different storage key.

## Debounce Hooks

Two debounce hooks exist:

| Hook | Used by | Safety guard | File |
|------|---------|--------------|------|
| `useDebounce` | Transaction search inputs | None | `lib/hooks/useDebounce.ts` |
| `useDebouncedValue` | Amount currency quote fetching | `mountedRef` prevents update after unmount | `lib/hooks/useDebouncedValue.ts` |

Both use 300 ms as the default delay. Search inputs use the simpler `useDebounce`. New search features should use `useDebounce` unless the component needs the unmount safety guard, in which case use `useDebouncedValue`.

## Cross-references

- [docs/global-search-results.md](./global-search-results.md) -- Global search page route and catalog
- [docs/transactions-filters-search-grouping.md](./transactions-filters-search-grouping.md) -- Filter chip AND logic, CSV export, QA targets
- [docs/KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md) -- `Cmd/Ctrl + K` shortcut and command palette registry
