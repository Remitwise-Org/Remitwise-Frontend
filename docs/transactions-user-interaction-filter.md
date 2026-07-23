# Transaction History: filtering to user-interaction entries

Audience: **contributor** working on `/transactions` or on any feature that
appends new entries to the transaction/activity list.

## Summary

Every row rendered by the Transaction History view (`app/transactions/page.tsx`)
represents a **user-initiated interaction** — an action a person took (sending
money, splitting a payment, paying a bill, etc.) — not a system-generated log
line (no background job, webhook retry, or admin action ever appears in this
list). The view's type filter is how a reader narrows that list down to the
specific kind of interaction they care about.

There is intentionally no "system event" transaction type to filter *out*:
the list only ever contains user-story-shaped entries in the first place.

## How the filter works

The `Transaction` model (`components/Dashboard/TransactionHistoryItem.tsx:22-44`)
gives every entry a `type: TransactionType`, where each value corresponds to a
concrete, user-triggered flow:

```ts
type TransactionType =
  | "Send Money"        // user sent a remittance
  | "Smart Split"        // user configured/triggered an automatic split
  | "Bill Payment"       // user paid a bill
  | "Insurance"          // user paid an insurance premium
  | "Savings"            // user moved money into a savings goal
  | "Family Transfer"    // user transferred to/from a family wallet
  | "Received";          // user received an incoming payment
```

`app/transactions/page.tsx:164-223` (`typeStyles`) maps each of those values to
a filter chip (icon + label + color). The chips are rendered as multi-select
toggles; `filteredTransactions` (`app/transactions/page.tsx:310`) is the
`useMemo` that applies the active chip selection (AND'd with search and status
filters) to `allTransactions`.

Example: selecting only the **Send** and **Split** chips shows just the rows
where a user actively moved or allocated funds, hiding bill/insurance/family
activity without needing a separate "user interaction" toggle — because every
option already is a user interaction.

## Extending this

If a future feature introduces a genuinely system-generated entry (e.g. an
automated retry or an admin adjustment), it must:

1. Add a new `TransactionType` value in `TransactionHistoryItem.tsx`.
2. Add a matching entry to `typeStyles` in `app/transactions/page.tsx`.
3. Update this doc and `docs/transactions-filters-search-grouping.md` to
   describe how to filter it in or out, since at that point "all entries are
   user interactions" would no longer hold.

Until then, no additional filter is needed to isolate user-interaction
entries — the full type-chip set already is that filter.

## Related docs

- [docs/transactions-filters-search-grouping.md](./transactions-filters-search-grouping.md) —
  full reference for search, chip, and grouping behavior on this page.
