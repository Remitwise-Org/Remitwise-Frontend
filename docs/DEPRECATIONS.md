# Deprecations Log

A central log of every deprecated component, utility, hook, and API route in the
RemitWise frontend. This document is written for **contributors** — use it to
verify whether a file or API surface you are touching is on its way out, and what
to use instead.

When you deprecate something, add an entry here with a concrete before/after
example so the next person can migrate in minutes, not hours.

---

## API Routes

### `/api/remittance/qoute` (typo alias)

- **Deprecated file:** `app/api/remittance/qoute/route.ts`
- **Replacement:** `app/api/remittance/quote/route.ts`

The original endpoint was registered with the misspelling `qoute`. The
canonical route is `/api/remittance/quote`. The old file re-exports from
the canonical handler so neither breaks, but new callers must use the
correct spelling.

**Before:**

```ts
// ❌ Typo — still works but misleading
const res = await authFetch("/api/remittance/qoute", { method: "POST", body });
```

**After:**

```ts
// ✅ Canonical endpoint
const res = await authFetch("/api/remittance/quote", { method: "POST", body });
```

---

## Components

### `StatCard` — `percentage` prop

- **Deprecated in:** `components/Dashboard/StatCard.tsx`
- **Replacement:** `detail1`

The `percentage` prop is a legacy alias for `detail1`. Both are accepted
(there is backward-compatible reconciliation inside the component), but new
code must use `detail1` so the prop name reflects what the value actually
represents — the primary trend/change text.

**Before:**

```tsx
<StatCard
  title="Sent this month"
  value="$1,240"
  percentage="+18%"                // ❌ legacy alias
  trend="up"
/>
```

**After:**

```tsx
<StatCard
  title="Sent this month"
  value="$1,240"
  detail1="+18%"                   // ✅ canonical prop
  trend="up"
/>
```

---

## Utilities & Libraries

### `lib/utils/error-handler.ts`

- **Deprecated file:** `lib/utils/error-handler.ts`
- **Replacement:** No direct replacement. The file is an empty stub containing
  only `// DEPRECATED`.
- **Status:** No imports of this file remain in the codebase. It is safe to
  delete in any cleanup PR.

---

### `lib/soroban-client.ts`

- **Deprecated file:** `lib/soroban-client.ts`
- **Replacement:** `lib/soroban/client.ts`

The old module used `NEXT_PUBLIC_SOROBAN_RPC_URL` (browser-exposed) and
hardcoded `Networks.TESTNET`, which caused savings-goal transactions to build
against the wrong network in production. The canonical client at
`lib/soroban/client.ts` reads `SOROBAN_RPC_URL` (server-only), resolves the
network passphrase dynamically, and wraps every RPC call with retry +
per-attempt timeout logic.

The deprecated file re-exports the same symbols from the canonical client
(`getSorobanClient`, `getNetworkPassphrase`, `getLatestLedger`,
`getLedgerSequence`, `SorobanClientError`) so existing external tooling
continues to compile. It will be removed in a future cleanup commit.

**Before:**

```ts
// ❌ Browser-exposed URL, hardcoded TESTNET
import { getSorobanClient } from "@/lib/soroban-client";
```

**After:**

```ts
// ✅ Server-only URL, network-aware
import { getServer, getNetworkPassphrase } from "@/lib/soroban/client";
```

---

### `utils/currency.ts` — `formatCurrency()`

- **Deprecated file:** `utils/currency.ts`
- **Replacement:** `formatCurrency` from `@/lib/i18n/formatters`

The legacy wrapper always renders as a plain localized decimal, ignoring the
`currency` option. New code should use the shared formatter that routes
through the active user locale and supports proper currency, decimal, percent,
and unit formatting.

Several option names are also deprecated:

| Legacy option       | Replacement               |
| ------------------- | ------------------------- |
| `stripZeros`        | `stripTrailingZeros`      |
| `minDecimalPlaces`  | `minimumFractionDigits`   |
| `maxDecimalPlaces`  | `maximumFractionDigits`   |

**Before:**

```ts
import { formatCurrency } from "@/utils/currency";

formatCurrency(1234.5, {
  currency: "USD",
  stripZeros: true,
  minDecimalPlaces: 0,
  maxDecimalPlaces: 4,
});
```

**After:**

```ts
import { formatCurrency } from "@/lib/i18n/formatters";

formatCurrency(1234.5, {
  currency: "USD",
  stripTrailingZeros: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});
```

---

### `lib/utils/format-currency.ts` — `formatCurrency()`

- **Deprecated file:** `lib/utils/format-currency.ts`
- **Replacement:** `formatCurrency` from `@/lib/i18n/formatters`

Another thin compatibility wrapper. The shared `@/lib/i18n/formatters`
implementation is the single source of truth for locale-aware rounding.
All entry points — hooks (`useFormatter`), components (`<FormattedCurrency>`,
`<FormattedNumber>`), and pure functions — funnel through the same shared
formatter.

**Before:**

```ts
import { formatCurrency } from "@/lib/utils/format-currency";

formatCurrency(1234.5, "USD", "en");
```

**After:**

```ts
import { formatCurrency } from "@/lib/i18n/formatters";

formatCurrency(1234.5, { currency: "USD", locale: "en" });
```

For React components, prefer the declarative API:

```tsx
import { FormattedCurrency } from "@/components/i18n";

<FormattedCurrency value={1234.5} currency="USD" />;
```

---

### `lib/anchor/client.ts` — `DEFAULT_TIMEOUT_MS`

- **Deprecated in:** `lib/anchor/client.ts`
- **Replacement:** `ANCHOR_DEFAULT_TIMEOUT_MS` from `lib/config/fetch-timeouts`

The `DEFAULT_TIMEOUT_MS` re-export is kept for backward compatibility. All
timeout policies are now centralized in `lib/config/fetch-timeouts.ts`.

**Before:**

```ts
import { DEFAULT_TIMEOUT_MS } from "@/lib/anchor/client";
```

**After:**

```ts
import { ANCHOR_DEFAULT_TIMEOUT_MS } from "@/lib/config/fetch-timeouts";
```

---

## Process

### When to add an entry

Add an entry to this log whenever you:

- Rename or relocate a public export (component, hook, utility).
- Deprecate a prop, option, or type alias.
- Introduce a new API endpoint that replaces an old one.
- Remove functionality with a backward-compatible stub.

### What to include

Each entry must have:

1. **What is deprecated** — file path and symbol name.
2. **What replaces it** — file path and symbol name of the canonical
   replacement.
3. **A concrete before/after example** — show the actual import or call site,
   not `foo()` placeholders.
4. **Why** (optional but recommended) — one sentence explaining the rationale.

### How to announce

- Mention the deprecation in the next release notes (see
  [RELEASE_NOTES_TEMPLATE.md](./RELEASE_NOTES_TEMPLATE.md)).
- If deprecating a component prop, update the matching Storybook story and
  the [COMPONENTS.md](./COMPONENTS.md) entry.
- Add a `@deprecated` JSDoc tag to the deprecated symbol pointing to this
  document.

### Removing deprecated items

Before deleting a deprecated file or symbol:

1. Search for all remaining imports referencing it.
2. Migrate each caller to the replacement.
3. Remove the entry from this log.
4. Note the removal in the release notes under "Removed."

---

## Related documentation

- [API Versioning & Deprecation Policy](../README.md#api-endpoints) — README section on
  the 6-month deprecation window for major API versions.
- [COMPONENTS.md](./COMPONENTS.md) — current component catalogue and prop
  documentation.
- [COMPONENT_LIFECYCLE.md](./COMPONENT_LIFECYCLE.md) — contributor workflow
  from Figma through design tokens, stories, tests, and production.
- [RELEASE_NOTES_TEMPLATE.md](./RELEASE_NOTES_TEMPLATE.md) — template for
  announcing deprecations in release notes.
- [DESIGN_TOKEN_MIGRATION.md](./DESIGN_TOKEN_MIGRATION.md) — step-by-step
  guide for renaming or deprecating design tokens.
