# Components

## Toolbar

A responsive container for action items with an integrated density switch. Items wrap (stack) when the viewport is too narrow to display them on one row.

**File:** `components/Toolbar.tsx`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | required | Toolbar action items |
| `density` | `'comfortable' \| 'compact'` | `useDensity()` context | Display density; overrides the context value when provided |
| `className` | `string` | `''` | Additional CSS classes forwarded to the root element |

### Behavior

- **Density switch:** A toggle button is rendered at the right end of the toolbar. Clicking it cycles between `comfortable` (roomier spacing) and `compact` (tighter spacing). The change is persisted to localStorage via the `DensityProvider` context.
- **Responsive wrapping:** Items use `flex-wrap` so they naturally stack into additional rows when the container is too narrow.
- **Density-aware spacing:** When `compact`, the toolbar uses `gap-space-xs` / `p-space-xs`; when `comfortable`, it uses `gap-space-sm` / `p-space-sm`.

### Accessibility

- Root element has `role="toolbar"` and `aria-orientation="horizontal"`.
- The density toggle has `aria-label` that describes the action ("Switch to compact view" / "Switch to comfortable view") and `aria-pressed` reflecting the current compact state.

### Integration

Wired into the density system via `useDensity()` from `@/lib/context/DensityContext`. The density preference is centralised in `lib/config/density.ts`.

### Storybook

- `Components/Toolbar` (`Default`, `Compact`, `SingleItem`, `ManyItems`)

### Tests

- `components/Toolbar.test.tsx` covers rendering, density toggle, aria attributes, class application, prop forwarding, and wrapping behavior.

## BackToTop

- [Layout Patterns](docs/LAYOUT_PATTERNS.md): conventions for page shells, stat rows, and cards used across the app.

See also: [Layout Patterns](./LAYOUT_PATTERNS.md) for how these components compose into full pages.

A floating "back to top" button that appears after the user scrolls past 800px.

**File:** `components/BackToTop.tsx`

### Behavior

- **Visibility:** Hidden at the top of the page; appears with a fade + slide-up
  animation once `window.scrollY > 800`.
- **Scroll:** Smooth-scrolls to the top of the page on click.
- **Focus:** After scrolling completes, focus is programmatically moved to the
  first `<h1>` on the page so keyboard users can continue navigating from the
  top.
- **Cleanup:** The scroll event listener is removed on unmount.

### Accessibility

- `aria-label="Back to top"` on the button.
- Icon has `aria-hidden="true"`.
- `focus-visible` ring using the primary-600/400 color palette.
- `pointer-events-none` while hidden so it does not block clicks underneath.

### Styling

- Uses `primary-600` / `primary-700` hover from the Tailwind config.
- Fixed position: `bottom-8 right-8`.
- Touch-target size (`h-11 w-11` = 44px).
- Uses `#010101` ring-offset to match the app background.

### Integration

Wired in `app/layout.tsx` so it is available on every route.

## Dashboard — Last synced indicator

A subtle timestamp showing when the dashboard data was last fetched.

**File:** `app/dashboard/page.tsx`

### Behavior

- Renders as a right-aligned `text-xs text-gray-500` line below the StatCard grid.
- Displays relative time: "Updated just now", "Updated 5 min ago", "Updated 1 hour ago".
- Falls back to a locale-aware absolute date after 24 hours (e.g. "Updated Jan 15, 2:30 PM").
- Uses the active user locale (plumbed from `useClientTranslator`).
- Hides entirely when `meta.cachedAt` is missing or invalid (no DOM node emitted).

### Source of truth

- `lib/utils/time-ago.ts` — `formatLastSynced(isoString, locale)` pure function.
- `lib/types/dashboard.ts` — `DashboardResponse.meta.cachedAt` is the server-provided ISO-8601 string.

### Tests

- `lib/utils/time-ago.test.ts` — unit tests for the formatting utility.
- `tests/unit/dashboard/dashboard-page.test.tsx` — integration test verifying the rendered text.

## Locale-aware formatting (issue #732)

A single source of truth for locale-aware numeric display, used so a rounding
rule only has to be fixed in one place. Three layers are exported from
`@/components/i18n`:

### `useFormatter()`

A React hook that returns stable, memoized formatters bound to the active user
locale (resolved through the existing cookie / preference / navigator /
default precedence in `lib/i18n/resolve-locale.ts`). Each helper accepts
formatting options locally; an optional override can be applied per call.

```ts
const { formatCurrency, formatNumber, locale } = useFormatter();
return <span aria-label={`Balance (${locale}): ${formatCurrency(1234.5, { currency: "USD" })}`} />;
```

Use the hook when the formatted string is consumed outside React's tree
(tooltips, ARIA labels, toast body copy).

### `<FormattedCurrency />`

Renders a value as a localized currency string. Forwards `className` and other
`<span>` attributes, so styling stays in Tailwind tokens.

```tsx
<FormattedCurrency value={1234.5} currency="USD" />                        // "$1,234.50"
<FormattedCurrency value={1234.5} currency="USDC" />                       // "1,234.50 USDC"
<FormattedCurrency value={1234.5} currency="USD" locale="es-ES" />          // Spanish formatting
```

### `<FormattedNumber />`

Renders a decimal, percent, or unit-aware number. Note that
`style="decimal"` defaults to `0` fraction digits, so callers must pass
`maximumFractionDigits` explicitly when they want to preserve fractional
precision. Supports `stripTrailingZeros` to drop trailing zeros from the
fractional part.

```tsx
<FormattedNumber value={1234567.89} maximumFractionDigits={2} />    // "1,234,567.89"
<FormattedNumber value={0.42} style="percent" />                    // "42%"
<FormattedNumber value={5} stripTrailingZeros maximumFractionDigits={4} /> // "5"
```

### Single source of truth

All three layers funnel through `lib/i18n/formatters.ts` (the pure
`formatNumericValue` / `formatCurrency` / `formatNumber` / `formatPercent`
helpers). Existing utilities (`utils/currency.ts`, `lib/utils/format-currency.ts`,
`lib/a11y/chartAccessibility.ts`) are kept as thin backwards-compatible
wrappers and route through the same shared implementation, so a future
rounding bug only has to be patched once.

### Storybook

Stories (each in their own `.stories.tsx` so Storybook registers exactly one
component per file):
- `Components/Locale/FormattedCurrency` (`UsdDefault`, `StablecoinFallback`,
  `ZeroValue`, `NegativeValue`, `SpanishLocaleOverride`, `RoundToWholeUnit`)
- `Components/Locale/FormattedNumber` (`Plain`, `Percent`, `StripZeros`,
  `SpanishOverride`)

> **Note:** the repository does not yet ship a `.storybook/` config, so the
> story files type-check and lint but are not registered in any UI until
> Storybook is wired up. They are kept next to the components so the wiring
> is trivial once the config lands.

### Tests

- `tests/unit/components/i18n/formatters.test.ts` covers the pure helpers
  across both supported locales, currency/decimal/percent styles,
  stablecoin-fallback formatting, and trailing-zero stripping.
- `tests/unit/components/i18n/FormattedCurrency.test.tsx` covers the React
  layer (defaults, locale override, unknown-currency fallback, prop
  forwarding, render-prop children, and the `useFormatter` hook).

---

## ConfirmDialog / useConfirm (issue #999)

A non-blocking, Promise-based replacement for `window.confirm` that integrates
with the app's design system.

**Files:**

- `lib/context/ConfirmContext.tsx` — React context, `ConfirmProvider`,
  `useConfirm` hook, and the internal `useConfirmInternal` hook.
- `components/ConfirmDialog.tsx` — The rendered dialog UI.

### Quick start

```tsx
"use client";

import { useConfirm } from "@/lib/context/ConfirmContext";

export default function DeleteButton({ id }: { id: string }) {
  const { confirm } = useConfirm();

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete record",
      description: "This action cannot be undone.",
      intent: "danger",
      confirmLabel: "Delete",
      cancelLabel: "Keep it",
    });
    if (ok) {
      // … proceed with deletion
    }
  };

  return (
    <button onClick={handleDelete} className="…">
      Delete
    </button>
  );
}
```

### API

#### `useConfirm()`

```ts
const { confirm } = useConfirm();
const result: boolean = await confirm(options?);
```

Must be called inside a `ConfirmProvider` (already provided globally via
`components/Providers.tsx`).

`confirm()` opens the dialog and returns a `Promise<boolean>` that resolves:

| User action            | Resolved value |
|------------------------|---------------|
| Clicks **Confirm**     | `true`        |
| Clicks **Cancel**      | `false`       |
| Clicks the **×** button | `false`      |
| Presses **Escape**     | `false`       |
| Clicks the **backdrop** | `false`      |

#### `ConfirmOptions`

| Prop             | Type                   | Default            | Description                              |
|------------------|------------------------|--------------------|------------------------------------------|
| `title`          | `string`               | `"Are you sure?"`  | Dialog heading                           |
| `description`    | `string`               | `""`               | Descriptive body copy (optional)         |
| `confirmLabel`   | `string`               | `"Confirm"`        | Label for the positive action button     |
| `cancelLabel`    | `string`               | `"Cancel"`         | Label for the negative action button     |
| `intent`         | `"primary" \| "danger"` | `"primary"`       | Visual style of the confirm button       |

### `ConfirmProvider`

Wraps the subtree that needs access to `useConfirm`. It is already mounted at
the top of the app inside `components/Providers.tsx`, so application code does
not need to add it.

### `ConfirmDialog`

Renders the actual dialog UI. Mount it once near the root; currently placed
inside `components/Providers.tsx` alongside other singleton UI (toasts, command
palette, dev panel).

The dialog is:

- **ARIA-accessible** — `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby`, `aria-describedby` (when description is present).
- **Focus-managed** — focuses the Confirm button on open; restores the
  previously focused element on close.
- **Keyboard navigable** — Tab/Shift+Tab cycle within the dialog; Escape
  cancels.
- **Backdrop-dismissible** — clicking the overlay resolves `false`.
- **Design-token compliant** — uses `primary-600`, `rounded-2xl`, and
  `bg-black/60` from the Tailwind config; no hard-coded colour values.

### Styling

| Prop value | Confirm button style        |
|------------|-----------------------------|
| `"primary"` | `bg-primary-600` (blue)   |
| `"danger"`  | `bg-red-600` (red)        |

### Accessibility

- Title is linked via `aria-labelledby="confirm-dialog-title"`.
- Description (when provided) is linked via
  `aria-describedby="confirm-dialog-description"`.
- Close button carries `aria-label="Cancel"`.
- All interactive elements have `focus-visible` outlines using
  `outline-primary-600`.

### Integration

`ConfirmProvider` and `ConfirmDialog` are already registered in
`components/Providers.tsx`. No additional wiring is required.

### Tests

`tests/unit/useConfirm.test.tsx` covers:

- Dialog hidden before `confirm()` is called
- Dialog shown after `confirm()` is called
- Resolves `true` on Confirm click
- Resolves `false` on Cancel, close, Escape, and backdrop clicks
- Dialog closes after resolution
- Multiple sequential calls
- Custom `title`, `description`, `confirmLabel`, `cancelLabel`
- `intent: "danger"` vs `intent: "primary"` button styling
- ARIA attributes (`role`, `aria-modal`, `aria-labelledby`,
  `aria-describedby`, `aria-label`)
- Throws when `useConfirm` is called outside `ConfirmProvider`
