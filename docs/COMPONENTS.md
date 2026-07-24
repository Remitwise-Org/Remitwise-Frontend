# Components

## BackToTop

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

## ConsentBanner (issue #988)

An analytics consent banner with Global Privacy Control (GPC) support.

**File:** `components/ConsentBanner.tsx`
**Logic:** `lib/consent/consent.ts`

### Behavior

- **Default-off in EU:** Users with an EU/EEA/UK/CH browser locale see the
  banner on first visit. Non-EU users are default-on (no banner).
- **GPC signal:** When `navigator.globalPrivacyControl` is `true`, analytics
  are silently denied — the banner is never shown.
- **Cookie persistence:** The user's choice is stored in a `rw-analytics-consent`
  cookie (180-day expiry, `SameSite=Lax`).
- **Sentry gating:** `sentry.client.config.ts` checks `isAnalyticsAllowed()`
  before calling `Sentry.init()`. If consent is not `"granted"`, Sentry does
  not initialise at all.
- **Accept → reload:** Accepting triggers a page reload so Sentry can
  initialise with the new consent state.
- **Decline → hide:** Declining hides the banner without a reload.

### Accessibility

- `role="dialog"` with `aria-label` sourced from i18n.
- Both buttons have unique IDs (`consent-accept-btn`, `consent-decline-btn`)
  for browser testing.
- Focus-visible ring using `primary-400` with `ring-offset-slate-900`.
- Keyboard-navigable: both buttons are tabbable in DOM order.

### Styling

- Fixed position: `bottom-0 inset-x-0 z-50`.
- Glass morphism: `bg-slate-900/95 backdrop-blur-md` with subtle top border.
- Dark-mode aware via `dark:` variants.
- Uses the existing `slide-in-bottom` animation from `tailwind.config.js`.
- Responsive: stacks vertically on mobile, horizontal on tablet+.
- Uses design tokens only — no hard-coded colours, spacing, or radii.

### Integration

Wired in `components/Providers.tsx` so it is available on every route.

### Tests

- `tests/unit/consent/consent.test.ts` covers the pure consent logic
  (GPC detection, EU locale heuristic, cookie read/write, consent resolution,
  and negative tests proving GPC always overrides).
- `tests/unit/components/ConsentBanner.test.tsx` covers the React component
  (visibility states, accept/decline interactions, accessibility attributes,
  and keyboard navigation).

