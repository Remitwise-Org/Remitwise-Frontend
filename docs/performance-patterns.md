# Performance Patterns

Small habits that add up: memoization boundaries, key selectors, event delegation.

Audience: **contributors** adding or reviewing React components and hooks.

> Related reading: [docs/architecture.md](architecture.md) for the layer map,
> [CONTRIBUTING.md](../CONTRIBUTING.md) for branch and PR conventions.

---

## Table of Contents

1. [Memoization boundaries](#memoization-boundaries)
   - [When to wrap with `memo`](#when-to-wrap-with-memo)
   - [When NOT to wrap with `memo`](#when-not-to-wrap-with-memo)
   - [`useMemo` for derived values](#usememo-for-derived-values)
   - [`useCallback` for stable function references](#usecallback-for-stable-function-references)
2. [Key selectors](#key-selectors)
   - [Stable keys prevent unnecessary unmounts](#stable-keys-prevent-unnecessary-unmounts)
   - [Intentional remount with `key`](#intentional-remount-with-key)
   - [Anti-patterns](#key-anti-patterns)
3. [Event delegation](#event-delegation)
   - [Attach one handler to the container](#attach-one-handler-to-the-container)
   - [When per-item handlers are fine](#when-per-item-handlers-are-fine)
4. [Checklist](#checklist)

---

## Memoization boundaries

### When to wrap with `memo`

Wrap a component with `memo` when **all three** of these are true:

1. The component renders a non-trivial subtree (chart, table, list of cards).
2. Its parent re-renders frequently (e.g. on every keystroke, polling tick, or context update).
3. Its own props are stable between those parent re-renders.

Real examples in this repo:

- [`RecentTransactionsWidget`](../components/Dashboard/RecentTransactionsWidget.tsx) — wraps a full table + mobile card list; its parent dashboard re-renders on density context changes.
- [`MoneyDistributionWidget`](../components/Dashboard/MoneyDistributionWidget.tsx) — wraps a Recharts `PieChart`; chart libraries are expensive to reconcile.
- [`SixMonthTrendsWidget`](../components/Dashboard/SixMonthTrendsWidget.tsx) — wraps a `LineChart` with four data series.
- `StatusBadge` inside `RecentTransactionsWidget` — rendered once per row; memoizing it avoids re-rendering every badge when only one row changes.

```tsx
// ✅ Correct — memo on a chart widget whose props rarely change
export default memo(function MoneyDistributionWidget({ distributionData, hasError, isLoading }) {
  // ...
});

// ✅ Correct — memo on a sub-component rendered in a loop
const StatusBadge = memo(function StatusBadge({ status }: { status: TransactionStatus }) {
  // ...
});
```

### When NOT to wrap with `memo`

- **Leaf nodes with cheap renders** — a `<span>` or a single `<div>` with a string. The `memo` comparison overhead exceeds the render cost.
- **Components whose props change on every render** — `memo` adds a comparison pass that always fails, making things slower.
- **Components that consume a frequently-changing context** — `memo` does not prevent re-renders triggered by context; use context splitting or `useMemo` inside the consumer instead.

```tsx
// ❌ Wasteful — StatCard is a simple card; wrapping it adds overhead with no benefit
// when its parent already controls when it re-renders
export default memo(StatCard); // avoid unless profiling shows a real gain
```

### `useMemo` for derived values

Use `useMemo` when a value is **computed from props or state** and the computation is non-trivial (string formatting over a large array, reduce over chart data, building accessibility label strings).

```tsx
// From MoneyDistributionWidget — total is derived from distributionData
const total = useMemo(
  () => distributionData.reduce((sum, d) => sum + parseFloat(d.amount.replace(/[^0-9.]/g, '')), 0),
  [distributionData],
);

// From MoneyDistributionWidget — accessibility label built from the data array
const labelItems = useMemo(
  () => distributionData.map((item) => `${item.name} ${item.displayPercent ?? `${item.value}%`}`),
  [distributionData],
);
```

Do **not** use `useMemo` for:

- Simple property access (`props.name`, `props.items.length`).
- Inline JSX — React's reconciler handles this efficiently.
- Values that change on every render anyway (the memoization never hits).

### `useCallback` for stable function references

Use `useCallback` when a function is passed as a prop to a memoized child, or when it is listed as a dependency of another hook.

```tsx
// From RecentTransactionsWidget — handleRetry is passed to WidgetErrorState (a memoized child)
const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

// From useFormAction — formAction is returned to callers who may pass it to memoized forms
const formAction = useCallback(
  (formData: FormData) => { /* ... */ },
  [method, url],
);
```

The dependency array must be **complete and accurate**. An empty array `[]` is only correct when the function genuinely has no dependencies (e.g. it only calls a stable setter from `useState`).

---

## Key selectors

### Stable keys prevent unnecessary unmounts

React uses the `key` prop to match elements across renders. An unstable key (one that changes when the data has not changed) causes React to **unmount and remount** the element, discarding DOM state, focus, and animation progress.

Rules:

- Use a **stable, unique identifier** from your data — a database ID, a slug, or a hash.
- Never use the array index as a key for lists that can be reordered, filtered, or paginated.
- Never generate a key inside the render function (e.g. `Math.random()` or `Date.now()`).

```tsx
// ✅ Correct — tx.id is a stable, unique identifier
{transactions.map((tx) => (
  <tr key={tx.id}>…</tr>
))}

// ✅ Correct — goal.name is stable and unique within the list
{goals.map((goal) => (
  <div key={goal.name}>…</div>
))}

// ❌ Wrong — index changes meaning when the list is filtered or sorted
{transactions.map((tx, index) => (
  <tr key={index}>…</tr>
))}

// ❌ Wrong — new key on every render forces a full remount
{transactions.map((tx) => (
  <tr key={Math.random()}>…</tr>
))}
```

### Intentional remount with `key`

Sometimes you **want** React to remount a subtree — for example, to reset all internal state after a retry. The `retryKey` pattern used across dashboard widgets is the canonical way to do this:

```tsx
// From RecentTransactionsWidget, SavingsByGoalWidget, MoneyDistributionWidget
const [retryKey, setRetryKey] = useState(0);
const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

return (
  <div key={retryKey}>
    {/* Incrementing retryKey forces a full remount, resetting all child state */}
    …
  </div>
);
```

This is intentional and correct. The `key` is on the **root element of the widget**, so only that widget remounts — not the whole page.

### Key anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| `key={index}` on a sortable list | Reorder causes wrong elements to update | Use a stable ID |
| `key={Math.random()}` | Remounts on every render, destroying DOM state | Use a stable ID |
| `key={item.name}` when names are not unique | Duplicate keys cause React warnings and incorrect diffing | Use a unique ID field |
| Missing `key` on list items | React falls back to index-based matching | Always provide a key |

---

## Event delegation

### Attach one handler to the container

When rendering a list of interactive items, attach a **single event handler to the container** and use `event.target` (or `event.currentTarget`) to identify which item was acted on. This avoids creating a new function reference for every item in the list.

```tsx
// ✅ Correct — one handler on the container, data attribute identifies the item
function BillList({ bills }: { bills: Bill[] }) {
  const handlePay = useCallback((e: React.MouseEvent<HTMLUListElement>) => {
    const button = (e.target as HTMLElement).closest('button[data-bill-id]');
    if (!button) return;
    const billId = button.getAttribute('data-bill-id');
    if (billId) payBill(billId);
  }, []);

  return (
    <ul onClick={handlePay}>
      {bills.map((bill) => (
        <li key={bill.id}>
          <button data-bill-id={bill.id}>Pay {bill.name}</button>
        </li>
      ))}
    </ul>
  );
}
```

The `closest()` call walks up the DOM from the click target to find the nearest matching ancestor, which handles clicks on child elements inside the button (e.g. an icon).

### When per-item handlers are fine

Event delegation is a micro-optimization. Prefer it for **large lists** (50+ items) or when the list re-renders frequently. For small, static lists, per-item handlers with `useCallback` are readable and correct:

```tsx
// ✅ Fine for small lists — per-item handler, stable reference via useCallback
{goals.map((goal) => {
  const handleClick = () => onSelect(goal.id); // ← recreated on every render
  return <GoalCard key={goal.id} goal={goal} onClick={handleClick} />;
})}

// ✅ Better for small lists — move the handler outside the map
const handleGoalClick = useCallback((id: string) => onSelect(id), [onSelect]);

{goals.map((goal) => (
  <GoalCard key={goal.id} goal={goal} onClick={() => handleGoalClick(goal.id)} />
))}
```

For lists rendered inside a `memo`-wrapped parent, prefer delegation or a stable callback to avoid breaking the memoization.

---

## Checklist

Before opening a PR that adds or modifies a component:

- [ ] Does the component render a non-trivial subtree that re-renders frequently? → consider `memo`.
- [ ] Are derived values computed inside the render body? → move to `useMemo`.
- [ ] Are functions passed to memoized children or used as hook dependencies? → stabilize with `useCallback`.
- [ ] Are list items keyed with stable, unique identifiers?
- [ ] Is `key={index}` used on a list that can be reordered or filtered? → replace with a stable ID.
- [ ] Does a list of 50+ items attach a handler per item? → consider event delegation.
- [ ] Is `retryKey` used intentionally to reset widget state on retry? → confirm the `key` is on the widget root, not a child.
