# Accessible-Focus Baseline

> **Audience:** Contributors adding or changing interactive UI in RemitWise.
> **Goal:** One reference for how focus is managed across the app — global styles, hooks, testing patterns, and the review contract.

## Principle

Every interactive element must be reachable and operable by keyboard alone, and the user must always know which element has focus (WCAG 2.1 AA, SC 2.4.7 Focus Visible).

## Global focus-visible style

A single global rule in `app/globals.css:173` ensures every focusable element gets a visible ring when focused via keyboard:

```css
*:focus-visible {
  outline: 2px solid #D72323 !important;
  outline-offset: 2px !important;
}
```

- The ring uses the brand red (`#D72323`) for sufficient contrast on both light and dark backgrounds.
- `!important` guarantees the ring is never accidentally removed by a component stylesheet.
- The `:focus-visible` pseudoclass means mouse clicks do **not** trigger the ring (see [focus-visible polyfill tests](../tests/unit/ui/focus-visible-polyfill.test.tsx)).

### Per-component overrides

When a component needs a thicker or offset ring, use the custom Tailwind tokens from `tailwind.config.js:44`:

```tsx
className="focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-brand-red/40 focus-visible:ring-offset-focus focus-visible:ring-offset-black"
```

| Token | Value | Purpose |
|-------|-------|---------|
| `ring-focus` | `3px` | Wider ring for emphasis |
| `ring-offset-focus` | `4px` | Larger offset to separate ring from the element |

The `focus-visible:outline-none` paired with `focus-visible:ring-*` keeps the native outline suppressed while using the styled ring. Never remove focus styles without providing a visible replacement.

## Focus trap hooks

For a contributor guide on when to trap focus, when not to, and which escape hatches are required, see [FOCUS_TRAPS.md](./FOCUS_TRAPS.md).

Two hooks handle modal/dialog focus trapping. Choose the one that matches your component's needs.

### `useFocusTrap` (basic) — `lib/hooks/useFocusTrap.ts`

A lightweight trap that cycles Tab/Shift+Tab within the container and calls `onEscape`:

```tsx
const containerRef = useFocusTrap({ isActive, onEscape });
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isActive` | `boolean` | yes | Activates the trap when true |
| `onEscape` | `() => void` | no | Called when Escape is pressed |

**Used by:** components that need trap-only behaviour without overlay-click or `prefersReducedMotion` integration.

### `useFocusTrap` (advanced) — `src/lib/hooks/useFocusTrap.ts`

Full-featured trap with overlay click, initial focus targeting, focus restoration toggling, and reduced-motion awareness:

```tsx
const modalRef = useFocusTrap({
  isActive,
  onEscape: onClose,
  onOverlayClick: onClose,
  restoreFocusOnClose: true,
  initialFocusRef,
});
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isActive` | `boolean` | yes | — | Activates the trap when true |
| `onEscape` | `() => void` | no | — | Escape key callback |
| `onOverlayClick` | `() => void` | no | — | Backdrop click callback |
| `restoreFocusOnClose` | `boolean` | no | `true` | Returns focus to the trigger element on close |
| `initialFocusRef` | `RefObject<HTMLElement>` | no | — | Element to receive focus on open; falls back to first focusable |

**Used by:** `WalletDropdown`, `ShortcutHelpModal`, `HowItWorksModal`, `EmergencyTransferModal`.

### Focusable-element selector

Both hooks query focusable elements using:

```ts
'button:not([disabled]), a[href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), details summary, [tabindex]:not([tabindex="-1"]):not([disabled])'
```

Elements with `aria-hidden="true"` are filtered out of the focusable set.

## Dialog focus management (`useDialog`)

The `lib/hooks/useDialog.ts` hook provides a full dialog interaction contract:

1. **On open:** The previously focused element is remembered; the dialog root receives focus.
2. **While open:** Escape closes the dialog. The dialog gets `role="dialog"` and `aria-modal="true"`.
3. **On close:** Focus is restored to the remembered element.

```tsx
const { dialogProps, triggerProps } = useDialog({ initialOpen: false });

return (
  <>
    <button {...triggerProps}>Open</button>
    <div {...dialogProps}>{/* dialog content */}</div>
  </>
);
```

The dialog root renders with `tabIndex={-1}` so it can receive programmatic focus without appearing in the Tab sequence.

## Roving tabindex pattern

For widgets with arrow-key navigation (e.g. calendar grids, menu bars), use the roving tabindex pattern:

- Exactly one child has `tabIndex={0}` (the "current" item).
- All other children have `tabIndex={-1}`.
- Arrow keys move the `tabIndex={0}` to the next/previous item and programmatically focus it.

Concrete example: `components/ui/AccessibleCalendarGrid.tsx` implements this with `tabIndex={focused ? 0 : -1}` on day cells and Arrow/Home/End/PageUp/PageDown key handlers.

## Keyboard-operable triggers

Any element that responds to a click must also respond to Enter and Space when focused:

```tsx
<button onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    activate();
  }
}}>
```

Interactive non-button elements (e.g. `SettingsItem`) use `tabIndex={0}` and the same `onKeyDown` pattern.

## Testing focus behaviour

### What to test

| Scenario | What to assert |
|----------|---------------|
| Keyboard Tab reaches the element | `expect(element).toHaveFocus()` |
| Focus trap wraps Tab at boundaries | After Tab on last element, first element has focus |
| Focus trap wraps Shift+Tab at boundaries | After Shift+Tab on first element, last element has focus |
| Escape closes and restores focus | Trigger element has focus after Escape |
| Mouse click does not leave stray focus ring | No `data-focus-visible` attribute after click |
| Keyboard focus shows ring | `data-focus-visible` attribute present after Tab |
| Focus trap cleans up on unmount | `removeEventListener` was called for `keydown` |

### Test helpers

Use `@testing-library/user-event` for realistic keyboard and mouse events:

```tsx
import userEvent from '@testing-library/user-event';

it('focuses_the_first_element_on_open', async () => {
  const user = userEvent.setup();
  render(<MyModal open />);
  await user.tab();
  expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
});
```

For axe-based accessibility scans, use the `expectNoAxeViolations` helper from `tests/helpers/a11y.ts`:

```tsx
import { expectNoAxeViolations } from '@/tests/helpers/a11y';

it('has_no_axe_violations', async () => {
  const { container } = render(<MyModal open />);
  await expectNoAxeViolations(container);
});
```

### Existing test references

| Test file | What it covers |
|-----------|---------------|
| `tests/unit/ui/focus-visible-polyfill.test.tsx` | Mouse vs keyboard focus-visible distinction |
| `tests/unit/hooks/useFocusTrap.test.tsx` | Focus trap Tab cycling, Escape, cleanup |
| `tests/unit/hooks/useFocusTrapAdvanced.test.tsx` | Advanced focus trap overlay click, reduced motion |
| `tests/unit/components/inert-focus-management.test.tsx` | Inert containers cannot receive focus |
| `tests/unit/components/tooltip-inert.test.tsx` | Tooltip inert behaviour |
| `tests/integration/modal-inert-behavior.test.tsx` | Modal + inert background integration |

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Removing `outline` without replacing it | Always pair `focus:outline-none` with `focus:ring-2` (or `focus-visible:ring-*`) |
| Using `:focus` instead of `:focus-visible` | `:focus` shows the ring on every click; use `:focus-visible` to show it only for keyboard users |
| Focusable element inside a focus trap with `tabIndex={-1}` | Use a positive or omitted `tabIndex` so the trap can find it |
| Forgetting `restoreFocusOnClose` | Users are disoriented when focus jumps unexpectedly after a modal closes |
| Hardcoding focus-ring colours | Use the `focus-visible:ring-focus` Tailwind token instead |

## Related documentation

- [Component States Guide](COMPONENT_STATES.md) — default, hover, focus, disabled, error, loading states
- [Keyboard Shortcuts](KEYBOARD_SHORTCUTS.md) — every registered keyboard shortcut
- [Sidebar Accessibility](a11y-sidebar.md) — WCAG 2.1 AA compliance for the navigation sidebar
- [Testing Guide](testing.md) — Vitest, Playwright, and node:test test strategy
- [Component Lifecycle](COMPONENT_LIFECYCLE.md) — from Figma to production component
- [Focus Traps](FOCUS_TRAPS.md) — when to trap focus, required escape hatches, and testing expectations
- [Design Handoff Template](DESIGN_HANDOFF_TEMPLATE.md) — behavioural contract template including accessibility
