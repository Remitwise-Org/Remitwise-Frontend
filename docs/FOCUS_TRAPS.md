# Focus traps

Audience: contributors building dialogs, drawers, menus, and other temporary
surfaces in RemitWise.

This guide explains **when to trap focus**, **how to trap it without breaking
keyboard flow**, and **which escape hatches must exist** so the interaction
still meets WCAG 2.1 AA expectations.

For the broader focus system used across the app, start with
[ACCESSIBLE_FOCUS_BASELINE.md](./ACCESSIBLE_FOCUS_BASELINE.md).

## Principle

A focus trap is for UI that temporarily takes over the user’s task. If the user
must finish, dismiss, or explicitly leave that surface before interacting with
page content behind it, trap focus inside it.

If the surface is only supplemental and users should still be free to continue
navigating the page, do **not** trap focus.

## When to trap focus

Trap focus for surfaces that behave like true dialogs or modal workspaces.

Use a focus trap for:

- modal dialogs
- blocking confirmation flows
- full-screen mobile drawers that replace the page task
- shortcut/help dialogs
- urgent overlays that intentionally suspend the background UI

Concrete repo examples already using this pattern include:

- `components/Dashboard/EmergencyTransferModal.tsx`
- `WalletDropdown`
- `ShortcutHelpModal`
- `HowItWorksModal`

The existing focus baseline documents these hook consumers in
[ACCESSIBLE_FOCUS_BASELINE.md](./ACCESSIBLE_FOCUS_BASELINE.md).

## When not to trap focus

Do **not** trap focus for surfaces that are advisory, inline, or non-blocking.

Avoid focus traps for:

- tooltips
- popovers that only supplement nearby controls
- toast notifications
- inline accordions
- dropdowns that do not suspend the surrounding task
- side content that appears beside the page but does not replace it

If the user should be able to tab past the surface and continue using the rest
of the page, a focus trap is the wrong interaction model.

## Required behaviors of a focus trap

A correct focus trap must provide all of the following.

### 1. Initial focus on open

When the trap opens, move focus into it immediately.

Prefer this order:

1. a clearly intended first action via `initialFocusRef`
2. the first meaningful interactive control inside the trap
3. the dialog container itself when the content needs to be read before acting

Example from the advanced hook API used in this repo:

```tsx
const modalRef = useFocusTrap({
  isActive,
  onEscape: onClose,
  onOverlayClick: onClose,
  restoreFocusOnClose: true,
  initialFocusRef,
});
```

### 2. Tab and Shift+Tab wrapping

While open, `Tab` and `Shift+Tab` must stay inside the trap.

- `Tab` on the last focusable element moves to the first
- `Shift+Tab` on the first focusable element moves to the last

### 3. Escape to dismiss

A modal trap must expose a keyboard escape hatch.

In RemitWise, that normally means wiring `Escape` to `onEscape` and closing the
surface unless product requirements explicitly forbid dismissal.

### 4. Focus restoration on close

When the trap closes, focus should return to the element that opened it.

The advanced hook already supports this contract:

```tsx
restoreFocusOnClose: true
```

Losing the user’s previous place is especially disruptive for screen-reader,
keyboard-only, and voice-control users.

### 5. Clear dialog semantics

A trapped surface should usually also expose dialog semantics:

- `role="dialog"` or `role="alertdialog"`
- `aria-modal="true"`
- an accessible name via `aria-labelledby` or `aria-label`

If the surface is visually modal but lacks modal semantics, assistive
technology users can get inconsistent results.

## Escape hatches

A focus trap is only acceptable if the user has a reliable way out.

Every trapped surface should provide as many of these escape hatches as apply:

- `Escape` closes it
- a visible close button is reachable by keyboard
- clicking the overlay closes it when that interaction is part of the design
- completion of the primary action exits the trap and restores focus

For overlay-dismissable surfaces, the advanced hook supports:

```tsx
onOverlayClick: onClose
```

If a product decision intentionally disables one escape hatch, document the
reason in the component and PR description. Do not silently ship an inescapable
trap.

## Use the existing hooks

This repository already has two focus-trap hooks.

### Basic hook — `lib/hooks/useFocusTrap.ts`

Use this when you only need:

- Tab wrapping
- Shift+Tab wrapping
- `Escape` handling

Example:

```tsx
const containerRef = useFocusTrap({ isActive, onEscape });
```

### Advanced hook — `src/lib/hooks/useFocusTrap.ts`

Use this when you also need:

- overlay click handling
- initial focus targeting
- focus restoration control
- reduced-motion-aware modal behavior

Example:

```tsx
const modalRef = useFocusTrap({
  isActive,
  onEscape: onClose,
  onOverlayClick: onClose,
  restoreFocusOnClose: true,
  initialFocusRef,
});
```

## Focusable content requirements inside the trap

The trap only works if its content is actually reachable.

The shared focusable selector used by the hooks includes:

```ts
'button:not([disabled]), a[href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), details summary, [tabindex]:not([tabindex="-1"]):not([disabled])'
```

That means contributors should avoid these mistakes:

- putting the intended first action behind `tabIndex={-1}`
- rendering only non-focusable elements inside the trap
- leaving disabled controls as the only actionable content
- hiding focusable content with `aria-hidden="true"`

## Container focus vs first-control focus

Not every dialog should focus the first button.

### Focus the first control when:

- the user is expected to act immediately
- the title and context are short
- the primary action is unambiguous

### Focus the container when:

- the content needs to be read before acting
- the dialog contains dense explanatory text
- focusing the first control would skip context a screen reader should announce first

In that case, give the container a programmatic focus target such as
`tabIndex={-1}` and a clear accessible name.

## Background content and inert behavior

A modal trap should not leave the page behind it effectively interactive.

When the background is meant to be suspended:

- keep focus inside the modal
- prevent interaction with background controls
- ensure screen-reader users are not encouraged to keep exploring the hidden page task

Related tests already exist in this repo:

- `tests/unit/components/inert-focus-management.test.tsx`
- `tests/integration/modal-inert-behavior.test.tsx`

## Testing checklist

When adding or changing a trapped surface, verify at minimum:

- keyboard `Tab` enters the trap and cycles within it
- `Shift+Tab` wraps in reverse
- `Escape` dismisses it when expected
- focus returns to the trigger after close
- the visible close control is keyboard reachable
- axe reports zero violations for the affected route or rendered component

The existing baseline doc also points to relevant unit tests:

- `tests/unit/hooks/useFocusTrap.test.tsx`
- `tests/unit/hooks/useFocusTrapAdvanced.test.tsx`

A minimal component-level axe example in this repo style is:

```tsx
import { expectNoAxeViolations } from '@/tests/helpers/a11y';

it('has no axe violations', async () => {
  const { container } = render(<MyModal open />);
  await expectNoAxeViolations(container);
});
```

## Keyboard-only walkthrough for PRs

When your PR adds or changes a focus trap, include a short walkthrough like:

```md
Keyboard walkthrough:
1. Tab to the "Open transfer help" button.
2. Press Enter to open the dialog.
3. Focus moves to the first dialog action.
4. Tab cycles through close, primary, and secondary actions without escaping to the page behind.
5. Press Escape to close the dialog.
6. Focus returns to the original trigger button.
```

That description gives reviewers a concrete contract to verify.

## Common mistakes

| Mistake | Why it is a problem | Preferred fix |
|---|---|---|
| Trapping focus in a tooltip or small popover | Users get stuck in UI that should be lightweight | Remove the trap and use normal focus flow |
| No `Escape` handler | Keyboard users may have no reliable exit | Wire `onEscape` to close |
| Not restoring focus | Users lose context after dismissing the surface | Enable `restoreFocusOnClose` |
| Autofocusing the wrong control | Screen readers may miss important context | Use `initialFocusRef` intentionally or focus the container |
| Visual modal without `aria-modal` and naming | Assistive tech gets an incomplete model of the interaction | Add dialog semantics and accessible naming |

## Related docs

- [ACCESSIBLE_FOCUS_BASELINE.md](./ACCESSIBLE_FOCUS_BASELINE.md)
- [COMPONENT_STATES.md](./COMPONENT_STATES.md)
- [COMPONENT_LIFECYCLE.md](./COMPONENT_LIFECYCLE.md)
- [ELEVATION.md](./ELEVATION.md)
- [DESIGN_QA_CHECKLIST.md](./DESIGN_QA_CHECKLIST.md)
