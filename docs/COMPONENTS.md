# Components

> For icon usage, sizing conventions, and how to add a custom icon, see [ICON_SYSTEM.md](ICON_SYSTEM.md).

## Notice

A reusable inline banner / callout for displaying informational, warning, error,
and success messages consistently across the app.

**File:** `components/Notice.tsx`

### Variants

| Variant | ARIA role | Use for |
| --- | --- | --- |
| `info` | `role="status"` | Non-urgent contextual messages (e.g. read-only mode, feature tips) |
| `warning` | `role="alert"` | Caution states requiring user awareness (e.g. rate changes, pending verification) |
| `error` | `role="alert"` | Failure or blocking conditions (e.g. failed transfers, validation errors) |
| `success` | `role="status"` | Positive confirmations (e.g. payment sent, settings saved) |

### Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `variant` | `"info" \| "warning" \| "error" \| "success"` | ✓ | — | Controls colour tokens, icon, and ARIA role. |
| `children` | `React.ReactNode` | ✓ | — | Body content. Accepts strings or rich React nodes. |
| `title` | `string` | — | — | Optional one-line heading rendered above the body. |
| `onDismiss` | `() => void` | — | — | When provided, renders a dismiss (×) button. Caller controls removal from DOM. |
| `action` | `{ label: string; onClick: () => void }` | — | — | Optional inline CTA rendered below the body. Use for a single contextual action. |
| `className` | `string` | — | `""` | Extra Tailwind classes on the wrapper (for layout overrides like margin or width). |

### Styling

- Surfaces use `status.{variant}.soft` (background) and `status.{variant}.border` (border) tokens from `tailwind.config.js` — no hardcoded values.
- Icon colour and title colour use `status.{variant}.fg`.
- Body text uses `text-white/70` for a softer contrast on the dark canvas.
- Icons are Lucide: `Info` (info), `AlertTriangle` (warning), `AlertCircle` (error), `CheckCircle2` (success).

### Accessibility

- `role="alert"` (assertive) for `error` and `warning` variants; `role="status"` (polite) for `info` and `success`.
- `aria-atomic="true"` on the wrapper so the full notice is announced as a unit.
- Status icon has `aria-hidden="true"` — it is a visual supplement to the text.
- Dismiss button has `aria-label="Dismiss"` and is keyboard-operable.
- Action button has `focus-visible` ring using `focus-visible:ring-2 focus-visible:ring-current`.
- Color is never the sole differentiator — each variant also has a distinct icon shape.

### Usage examples

```tsx
// Informational, body-only
<Notice variant="info">Your wallet is connected in read-only mode.</Notice>

// Warning with title and dismiss (controlled)
const [open, setOpen] = useState(true);
{open && (
  <Notice variant="warning" title="Rates have changed" onDismiss={() => setOpen(false)}>
    Exchange rates updated since you started this transfer. The quoted amount may differ.
  </Notice>
)}

// Error with retry action
<Notice
  variant="error"
  title="Transfer failed"
  action={{ label: "Retry", onClick: handleRetry }}
>
  The transfer could not be completed. Please check your balance.
</Notice>

// Success, no title
<Notice variant="success">Settings saved successfully.</Notice>
```

### Integration

Import directly — no context provider required.

```tsx
import Notice from "@/components/Notice";
```

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

## PageHeader

A reusable page header component used on core pages (like Bills, Family, and Savings Goals) that renders the page title, description, and primary CTA.

**File:** `components/PageHeader.tsx`

### Behavior

- **Sticky on Tall Screens:** On viewports with height >= 800px (configured via `TALL_SCREEN_MIN_HEIGHT` in `lib/config/layout.json` and the `tall` Tailwind theme breakpoint), the header stays sticky (`tall:sticky`) and remains in view during scroll.
- **Top Offset:** Responsive top offset adjusts to `top-16` / `top-20` based on the fixed primary navigation height to prevent layout overlaps.

### Integration

Used in:
- `app/bills/page.tsx`
- `app/family/page.tsx`
- `app/dashboard/goals/page.tsx`

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


---

## ShortcutTooltip

Wraps any interactive element to show a keyboard shortcut hint on hover and keyboard focus.
Meets **WCAG 2.1 AA** with semantic ARIA, keyboard dismissal, and platform-aware shortcut notation.

**File:** `components/ui/ShortcutTooltip.tsx`

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | — | The wrapped trigger element (button, link, etc.) |
| `label` | `string` | — | Human-readable action name (e.g. "Command Palette") |
| `shortcut` | `string` | — | Keyboard shortcut hint (e.g. `"⌘K"`, `"Ctrl+S"`, `"?"`) |
| `side` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Tooltip position relative to trigger |
| `className` | `string` | — | Extra class on the wrapper `<div>` |

### Platform-aware shortcuts

The component automatically normalises shortcuts for the user's platform:

- **macOS:** Shows `⌘K`, `⇧P`, `⌥A` as-is
- **Windows/Linux:** Converts to `Ctrl+K`, `Shift+P`, `Alt+A`
- Other modifiers: `⌘` → `Ctrl+`, `⇧` → `Shift+`, `⌥` → `Alt+`

Example:
```tsx
<ShortcutTooltip label="Search" shortcut="⌘/">
  <button>🔍</button>
</ShortcutTooltip>
// Shows "⌘/" on Mac, "Ctrl+/" on Windows
```

### Accessibility

✅ **WCAG 2.1 AA compliant:**

- **SC 1.3.1 (Info & Relationships):** `aria-describedby` links the trigger to the tooltip when visible
- **SC 2.4.7 (Focus Visible):** Tooltip appears on keyboard focus, not pointer-only
- **SC 1.4.13 (Content on Hover/Focus):** Dismissible with `Escape` key; stays visible until focus is lost or user presses `Escape`
- **Color contrast:** `≥ 4.5:1` for text, `≥ 3:1` for container (verified via design tokens)

**ARIA:**
- Tooltip has `role="tooltip"` (ARIA 1.1)
- Shortcut badge has `aria-label="keyboard shortcut: ⌘K"`
- Screen reader fallback: `.sr-only` span containing the full label and shortcut

**Keyboard navigation:**
- `Tab` / `Shift+Tab`: Focus the wrapped element
- `Hover` or `Focus`: Show tooltip
- `Escape`: Dismiss tooltip
- `Blur`: Hide tooltip

### Styling

Uses Tailwind classes with CSS design tokens for colors:
- Label background: `bg-gray-900` (light) / `bg-gray-800` (dark)
- Label text: `text-gray-50` (light) / `text-gray-100` (dark)
- Badge background: `bg-gray-700` (light) / `bg-gray-600` (dark)
- Badge border: `border-gray-600` (light) / `border-gray-500` (dark)

Tokens are defined in `app/globals.css`:
```css
--tooltip-bg: rgb(17, 24, 39);
--tooltip-fg: rgb(249, 250, 251);
--tooltip-kbd-bg: rgb(55, 65, 81);
--tooltip-kbd-fg: rgb(229, 231, 235);
--tooltip-kbd-border: rgb(75, 85, 99);
```

### Usage

```tsx
import ShortcutTooltip from '@/components/ui/ShortcutTooltip'
import { Search } from 'lucide-react'

export default function Nav() {
  return (
    <ShortcutTooltip label="Command Palette" shortcut="⌘K">
      <button
        aria-label="Command Palette"
        onClick={openPalette}
        className="p-2 rounded hover:bg-white/10"
      >
        <Search className="w-5 h-5" />
      </button>
    </ShortcutTooltip>
  )
}
```

### Stories

`UI/ShortcutTooltip` — Seven stories:
- `CommandPalette` — Default Command Palette button
- `HelpButton` — Help/Shortcuts button with `?`
- `MobileMenu` — Mobile hamburger with `Esc`
- `AllPositions` — Demonstrates all four position options
- `CommonShortcuts` — Gallery of common shortcuts (Save, Undo, Redo, etc.)
- `KeyboardAccessible` — Focus management and keyboard navigation demo
- `WithCustomClassName` — Example with custom wrapper styling

### Tests

`components/ui/ShortcutTooltip.test.tsx` — 15 tests covering:
- Rendering (children, initial state, screen reader text)
- Hover behavior (show/hide, label/shortcut display)
- Keyboard accessibility (focus, blur, Escape)
- Platform detection (macOS `⌘K`, Windows `Ctrl+K`, modifiers)
- ARIA linking (`aria-describedby`, `role="tooltip"`)
- Positioning (`side` prop)

### Current usage in app

Applied to:
- **Header (PrimaryNav):** Command Palette button (⌘K)
- **Header (PrimaryNav):** Help/Shortcuts button (?)
- **Mobile nav (MobileNav):** Hamburger menu button (Esc)

### Design decisions

1. **Component wrapping:** Wraps the trigger element rather than being a standalone button, so it works with any interactive element (buttons, links, icon buttons, custom components).

2. **Platform awareness:** Automatically shows the correct shortcut notation for the user's OS, reducing platform-specific documentation burden.

3. **CSS variables:** Uses design tokens from `globals.css` so theming is centralized and consistent.

4. **Focus-based:** Shows on both hover and focus to ensure keyboard users discover shortcuts without needing to read documentation.

5. **Escape dismissal:** Allows keyboard users to close tooltips without moving focus away from the trigger.
