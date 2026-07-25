# Global Search Results Page

## Purpose

The `/search?q=...` route provides a single place for operators and support staff to discover matching invoices, addresses, and settings items from one query string.

## Behavior

- Querying `/search?q=invoice` returns matching invoice records grouped by category.
- Querying `/search?q=address` returns any matching address-related entries.
- Querying `/search?q=settings` surfaces matching account configuration results.
- Empty, whitespace-only, or missing queries show a concise empty state instead of a broken list.

## Navigation

The command palette now exposes a `Global Search` route so the page is reachable from the existing keyboard shortcut flow (`Ctrl/Cmd + K`).

## Implementation Notes

The catalog of searchable results lives in `lib/search/globalSearchCatalog.ts` so the route, command palette entry, and tests share the same source of truth.
