# Components

For the contributor workflow that takes a component from Figma through design
tokens, Storybook stories, tests, and production integration, see
[COMPONENT_LIFECYCLE.md](COMPONENT_LIFECYCLE.md).

## AccessibleCalendarGrid

A fully accessible calendar grid date-picker that meets **WCAG 2.1 AA**.

**File:** `components/ui/AccessibleCalendarGrid.tsx`

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `CalendarDate \| null` | `null` | Currently selected date |
| `onChange` | `(date: CalendarDate) => void` | — | Fired when the user selects a date |
| `minDate` | `CalendarDate` | — | Minimum selectable date (inclusive) |
| `maxDate` | `CalendarDate` | — | Maximum selectable date (inclusive) |
| `locale` | `string` | `"en-US"` | Locale for month/weekday names (e.g. `"ar-SA"`, `"fr-FR"`) |
| `firstDayOfWeek` | `0 \| 1` | `0` | `0` = Sunday, `1` = Monday (ISO 8601) |
| `className` | `string` | — | Extra classes on the wrapper |
| `ariaLabel` | `string` | `"Calendar"` | Accessible label for the widget |

### Keyboard navigation

| Key | Action |
|---|---|
| Arrow Left / Right | Move focus one day backward / forward |
| Arrow Up / Down | Move focus one week backward / forward |
| Home | First day of the current week |
| End | Last day of the current week |
| Page Up | Previous month |
| Page Down | Next month |
| Enter / Space | Select the focused date |
| Tab | Move to the prev/next month navigation buttons |

### Accessibility

- Container: `role="application"` with `aria-label`
- Grid: `role="grid"` labelled by the month/year heading
- Column headers: `role="columnheader"` (weekday abbreviations)
- Day cells: `role="gridcell"` with `aria-selected`, `aria-disabled`, `aria-label` (full long-form date string), and `aria-current="date"` for today
- Month navigation: announced via `aria-live="polite"` region
- Focus ring: `ring-focus` token (3 px), `ring-offset-focus` token (4 px)
- Touch targets: `h-11 w-11` (44 × 44 px, WCAG 2.1 minimum)
- Roving `tabIndex` pattern keeps a single tab stop in the grid

### RTL

Pass an RTL locale (`"ar"`, `"he"`, `"fa"`, `"ur"`, …) and the component automatically sets `dir="rtl"` on its wrapper and flips the prev/next chevrons.

### Usage

```tsx
import { AccessibleCalendarGrid } from "@/components/ui/AccessibleCalendarGrid";

<AccessibleCalendarGrid
  value={{ year: 2026, month: 7, day: 15 }}
  onChange={(date) => console.log(date)}
  ariaLabel="Remittance date picker"
/>
```

### Stories

`Components/UI/AccessibleCalendarGrid` — eight stories covering: `Default`, `WithSelectedDate`, `Controlled`, `WithMinMax`, `RTLArabic`, `RTLHebrew`, `MondayFirstDay`, `FrenchLocale`, `JapaneseLocale`.

### Tests

`components/ui/AccessibleCalendarGrid.test.tsx` — 30 tests covering ARIA roles and structure, keyboard navigation (Arrow keys, Page Up/Down, Enter/Space), mouse interaction, RTL, and four axe audit passes (zero violations).

---

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

## WhatsNewContext

A context provider that manages the "What's New" onboarding tour panel, which shows
changelog entries to users on first visit and allows them to replay the tour later.

**File:** `lib/context/WhatsNewContext.tsx`

### Behavior

- **Auto-open:** Opens automatically on first visit when no localStorage entry exists
  (`remitwise_whats_new_last_seen`).
- **Persistence:** Stores the last seen changelog entry ID in localStorage to prevent
  re-showing the same entries.
- **Replay:** Provides a `replay()` function that clears the stored last seen ID and
  re-opens the panel, allowing users to see all changelog entries again.
- **Unread count:** Calculates the number of unread entries based on the stored last
  seen ID.

### API

```ts
interface WhatsNewContextValue {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    entries: ChangelogEntry[];
    readIds: Set<string>;
    unreadCount: number;
    markAllRead: () => void;
    replay: () => void;  // Clears localStorage and re-opens the panel
}
```

### Integration

- Wrapped in `app/dashboard/layout.tsx` to provide context to dashboard pages.
- The replay button is exposed in `components/settings/PreferencesSection.tsx` under
  the Preferences section, allowing users to replay the onboarding tour at any time.

### Tests

- `tests/unit/components/ReceiptPageContent.test.tsx` covers the receipt page
  content component for valid/invalid hashes and successful/missing transactions.

## ConnectionQualityIndicator

A visual indicator that monitors the `/api/health` endpoint and displays the current connection quality.

**File:** `components/ConnectionQualityIndicator.tsx`

### Behavior

- **Polling:** Automatically pings `/api/health` once per minute using `useSwrQuery` and the centralized `HEALTH_PING_INTERVAL_MS` constant.
- **States:** 
  - **Loading:** Yellow pulsing dot (`bg-yellow-400 animate-pulse`).
  - **Healthy:** Green dot (`bg-green-500`) when the API returns `{ status: 'ok' }`.
  - **Error/Unhealthy:** Red dot (`bg-red-500`) if the fetch fails or the API returns `{ status: 'unhealthy' }`.
- **Tooltip:** Uses the `Tooltip` component to display "Checking connection...", "Connection stable", or "Connection error" on hover.

### Integration

Wired into `components/footer.tsx` to appear globally across the application, adjacent to the copyright text.

### Storybook

- `Components/ConnectionQualityIndicator` (`Default`)

### Tests

- `tests/unit/components/ConnectionQualityIndicator.test.tsx` covers rendering states and polling behavior.
