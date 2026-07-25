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
