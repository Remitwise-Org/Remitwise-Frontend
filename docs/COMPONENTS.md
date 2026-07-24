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

## Skeleton (issue #932)

Loading placeholders. Two variants: an animated **shimmer** and a flat
**static** fill. The shimmer variant falls back to the static rendering for
users who have asked for reduced motion.

**File:** `components/ui/Skeleton.tsx`

### `<Skeleton />`

A single placeholder shape.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `variant` | `"shimmer" \| "static"` | `"shimmer"` | `shimmer` animates a highlight across the shape; `static` never animates. |
| `className` | `string` | `""` | Sizing and radius, as Tailwind utilities. |
| `style` | `CSSProperties` | — | For values Tailwind cannot express, e.g. a percentage height. |

```tsx
<Skeleton className="h-4 w-24 rounded" />                  // shimmer
<Skeleton variant="static" className="h-4 w-24 rounded" /> // never animates
```

### Reduced motion

`variant="shimmer"` means "animate *unless the user has asked us not to*". It
is not an override: under `prefers-reduced-motion: reduce` a shimmer skeleton
renders identically to a static one. This satisfies WCAG 2.1 SC 2.2.2 (Pause,
Stop, Hide) — the shimmer is an automatic animation that runs for longer than
five seconds and has no pause control.

The fallback lives in `app/globals.css`, not in the component, for three
reasons:

- it is correct during server rendering and before hydration, whereas a
  `matchMedia` hook would flash the animation on first paint;
- it cannot cause a hydration mismatch;
- it keeps `Skeleton` usable from server components, which is where the
  `app/**/loading.tsx` routes render it.

`usePrefersReducedMotion()` (`lib/hooks/`) is still the right tool for
JS-driven animation. It is deliberately *not* used here.

The reduced-motion rule drops `background-image` as well as `animation`.
Stopping the animation alone would leave the gradient frozen part-way through
its sweep, which reads as a lopsided highlight rather than a placeholder.

Pass `variant="static"` when a surface should never animate regardless of the
user's setting.

### `<SkeletonGroup />`

Wraps a set of placeholder shapes in a polite live region, so screen reader
users are told the surface is loading instead of meeting a run of empty,
unlabelled boxes.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `label` | `string` | `"Loading"` | Name the surface: `"Loading transaction history"`. Rendered `sr-only`. |
| `className` | `string` | — | Applied to the group's root, so it can replace an existing layout wrapper without adding a DOM level. |
| `style` | `CSSProperties` | — | |

```tsx
<SkeletonGroup className="space-y-8" label="Loading dashboard">
  <SkeletonCard variant="stat" />
  <SkeletonCard variant="chart" />
</SkeletonGroup>
```

### Accessibility

- Every `<Skeleton />` is `aria-hidden="true"`. The shapes carry no
  information, and a screen reader walking forty unlabelled boxes is worse than
  silence.
- `<SkeletonGroup />` renders `role="status"` + `aria-busy="true"` with an
  `sr-only` label. `role="status"` is polite, so it will not interrupt.
- **Use exactly one group per loading surface.** Nested live regions announce
  more than once. This is why `SkeletonCard`, `SkeletonList`, `SkeletonChart`
  and `SkeletonWidget` are plain decorative containers — they are designed to
  sit *inside* a group.
- Nothing in a skeleton is focusable, so there is no keyboard surface and no
  focus order to preserve. Tab order is unchanged when a placeholder is swapped
  for real content.
- Contrast: the placeholders are decorative and hidden from assistive
  technology, so WCAG 1.4.11 does not apply to them (it exempts content that is
  "purely decorative"). They deliberately keep the existing low-contrast
  design. `--skeleton-static` is set to the shimmer's *highlight* value rather
  than its base, so removing the motion does not also make the placeholder
  fainter than the animated version's average.

### Styling

Colours come from the `--skeleton-base` / `--skeleton-highlight` /
`--skeleton-static` custom properties, documented in `docs/THEMING.md`. The
classes are emitted into Tailwind's `components` layer, so any utility passed
via `className` overrides them.

### Composite skeletons

`SkeletonCard`, `SkeletonList`, `SkeletonChart` and `SkeletonWidget` compose
`<Skeleton />` into common shapes and are unchanged apart from inheriting the
new variants. The page-level skeletons in `components/ui/LoadingSkeletons.tsx`
(used by the `app/**/loading.tsx` routes) each wrap their content in a single
`<SkeletonGroup />`.

### Storybook

- `UI/Skeleton` (`Shimmer`, `Static`, `ShimmerVersusStatic`, `Shapes`)
- `UI/SkeletonGroup` (`Default`, `StaticShapes`)

> As with the locale stories above, the repository does not yet ship a
> `.storybook/` config, so these files lint but are not registered in any UI.

### Tests

`tests/unit/ui/skeleton.test.tsx` covers the variant classes, the decorative
`aria-hidden`, the live region and its label, the single-live-region guarantee
under nesting, and a `jest-axe` scan. jsdom does not evaluate media queries, so
the reduced-motion fallback is covered by asserting against the rule in
`app/globals.css` directly.
