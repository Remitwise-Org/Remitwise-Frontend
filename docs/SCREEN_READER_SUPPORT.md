# Screen Reader Support & Testing Guide

> **Audience:** Contributors adding or changing UI in RemitWise.
> **Goal:** A single reference for which screen readers we support, how to test with them, and the patterns we use to ensure WCAG 2.1 AA compliance.

---

## Supported Screen Readers

RemitWise commits to supporting the following screen reader and browser combinations. These represent the most widely used assistive technology pairings as reported by the [WebAIM Screen Reader User Survey](https://webaim.org/projects/screenreadersurvey/).

| Platform | Screen Reader | Browser | Priority |
|----------|--------------|---------|----------|
| **macOS** | VoiceOver (built-in) | Safari, Chrome | Tier 1 |
| **Windows** | NVDA (free, v2023+) | Chrome, Firefox | Tier 1 |
| **Windows** | JAWS (2023+) | Chrome | Tier 2 |
| **Android** | TalkBack (built-in) | Chrome | Tier 1 |
| **iOS** | VoiceOver (built-in) | Safari | Tier 1 |
| **Linux** | Orca | Firefox | Tier 3 |

### Priority Tiers

- **Tier 1** – Every PR that touches interactive UI must be manually tested on at least one Tier 1 combination before merge. Automated axe checks cover the rest.
- **Tier 2** – Tested in the release QA pass. Reported issues are treated as high-severity bugs.
- **Tier 3** – Best-effort. Community-reported issues are welcomed.

---

## How to Test with Screen Readers

### Quick Start by Platform

#### macOS: VoiceOver

1. **Enable:** `Cmd + F5` (or System Settings → Accessibility → VoiceOver).
2. **Basic navigation:**
   - `Ctrl + Option + Right Arrow` – Read next item.
   - `Ctrl + Option + Left Arrow` – Read previous item.
   - `Ctrl + Option + Space` – Activate (click) current item.
   - `Tab` – Jump to next focusable control.
   - `Ctrl + Option + U` – Open Rotor (landmarks, headings, links, form controls).
3. **Landmarks:** Open Rotor → "Landmarks" → verify `banner`, `main`, `navigation`, `contentinfo` are present.
4. **Headings:** Open Rotor → "Headings" → verify heading hierarchy (no skipped levels).
5. **Disable:** `Cmd + F5` again.

#### Windows: NVDA

1. **Download:** [nvaccess.org](https://www.nvaccess.org/) (free).
2. **Basic navigation:**
   - `Insert + Down Arrow` – Read continuously from cursor.
   - `Tab` / `Shift + Tab` – Move between focusable elements.
   - `Insert + F7` – Elements List (links, headings, landmarks, form fields).
   - `Insert + Space` – Focus mode / browse mode toggle.
   - `Enter` or `Space` – Activate element.
3. **Landmarks:** `Insert + F7` → "Landmarks" → verify structure.
4. **Headings:** `Insert + F7` → "Headings" → verify hierarchy.
5. **Quit:** `Insert + Q`.

#### Android: TalkBack

1. **Enable:** Settings → Accessibility → TalkBack → On.
2. **Basic navigation:**
   - Swipe right – Move to next element.
   - Swipe left – Move to previous element.
   - Double-tap anywhere – Activate.
   - Swipe down then up (or up then down) – Change navigation granularity (headings, links, controls).
3. **Landmarks:** Navigate by "Landmarks" granularity.
4. **Headings:** Navigate by "Headings" granularity.

#### iOS: VoiceOver

1. **Enable:** Settings → Accessibility → VoiceOver → On.
2. **Basic navigation:**
   - Swipe right – Next element.
   - Swipe left – Previous element.
   - Double-tap – Activate.
   - Rotor gesture (two-finger twist) – Change navigation mode (headings, landmarks, links).

### What to Test (Checklist)

For every interactive surface you build or change, manually verify:

| # | Check | How to Verify |
|---|-------|---------------|
| 1 | **Page title** is announced on load | Listen for the `<title>` when the page finishes loading |
| 2 | **Landmarks** are present and correctly labeled | Use the Rotor / Elements List to list landmarks |
| 3 | **Heading hierarchy** is logical and unbroken | Navigate by heading; there should be no skipped levels (h1→h3 without h2) |
| 4 | **All interactive elements** are reachable via Tab | Tab through the page; no control is skipped |
| 5 | **Focus order** follows visual order | Tab forward and Shift+Tab backward — the sequence should make sense |
| 6 | **Focus is visible** at all times | A red 2px outline must appear on every focused element |
| 7 | **Buttons and links** have accessible names | The screen reader should announce a meaningful name, not "unlabelled button" |
| 8 | **Images** have appropriate alt text | Decorative images are ignored (`aria-hidden`); informative images have meaningful `alt` text |
| 9 | **Form controls** have labels and error guidance | Every input has a label; errors are announced via `role="alert"` |
| 10 | **Dynamic content changes** are announced | Live regions (`aria-live`) announce status updates without moving focus |
| 11 | **Modal dialogs** trap focus and announce correctly | Focus enters the dialog on open, stays trapped, and returns on close |
| 12 | **State changes** are communicated | `aria-expanded`, `aria-pressed`, `aria-current` reflect the current state |

---

## Keyboard-Only Testing

Before testing with a screen reader, verify the surface works with keyboard alone:

1. **Unplug your mouse.** Use only Tab, Shift+Tab, Enter, Space, Escape, and Arrow keys.
2. **Every interactive element** must be reachable and operable.
3. **No keyboard traps.** You should never reach a point where Tab doesn't move focus.
4. **Focus order** must be logical — generally left-to-right, top-to-bottom.
5. **Custom widgets** (date pickers, comboboxes, menus) must support standard arrow-key patterns.

### Keyboard Walkthrough Template for PRs

Copy this into your PR description when you add or change interactive UI:

```md
## Keyboard Walkthrough

1. Tab to [first interactive element]. → [Describe what happens]
2. Press Enter/Space to activate. → [Describe result]
3. Tab through remaining controls. → [Note any issues]
4. Press Escape on any modal/drawer. → Focus returns to trigger.
5. Shift+Tab to reverse. → Order is logical.
```

---

## Colour Contrast

All text and UI components must meet WCAG 2.1 AA contrast minimums:

| Element | Minimum Ratio |
|---------|---------------|
| Normal text (< 18pt / 14pt bold) | 4.5:1 |
| Large text (≥ 18pt / 14pt bold) | 3:1 |
| UI components and graphical objects | 3:1 |

### How to Test

1. **Automated:** Run `@axe-core/playwright` on the route (see [Axe Testing](#axe-testing)).
2. **Manual:** Chrome DevTools → Rendering tab → "Emulate vision deficiencies" → check with blurred/achromatopsia modes.
3. **Programmatic:** Use the `lib/a11y/wcag-contrast.ts` helpers to compute ratios in unit tests.

### Design Token Usage

Never hard-code colours. Use the Tailwind semantic tokens from `tailwind.config.js`:

```tsx
// ✅ Correct — uses design tokens
<div className="text-status-error-fg bg-status-error-bg border-status-error-border">

// ❌ Incorrect — hard-coded colour
<div className="text-red-500 bg-red-100 border-red-300">
```

---

## Axe Testing

### Running axe in Playwright E2E Tests

All e2e spec files are in `tests/e2e/`. Add axe checks using the pattern in `nav-a11y.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("route has zero axe violations", async ({ page }) => {
  await page.goto("/your-route");
  const results = await new AxeBuilder({ page })
    .include("main")
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Running axe in Component Tests

Use the `expectNoAxeViolations` helper from `tests/helpers/a11y.ts`:

```tsx
import { expectNoAxeViolations } from "@/tests/helpers/a11y";

it("has no axe violations", async () => {
  const { container } = render(<MyComponent />);
  await expectNoAxeViolations(container);
});
```

### Axe Report for PRs

When your PR touches a UI surface:

1. Run `npx playwright test tests/e2e/<your-spec>.spec.ts` locally.
2. If using Chrome DevTools, open the Axe DevTools panel and export the report.
3. Attach the axe report (screenshot or JSON) to the PR description.
4. The PR description should state: **"Axe: zero violations on [route name]."**

---

## Existing Accessibility Patterns in RemitWise

When building UI, reuse these existing primitives rather than hand-rolling ARIA:

| Pattern | Component / Hook | Docs |
|---------|-----------------|------|
| Live regions (status announcements) | `components/ui/LiveRegion.tsx` | [ARIA_LIVE_REGIONS.md](./ARIA_LIVE_REGIONS.md) |
| Focus traps (modals, dialogs) | `lib/hooks/useFocusTrap.ts` | [FOCUS_TRAPS.md](./FOCUS_TRAPS.md) |
| Focus visible (global ring) | `app/globals.css:173` | [ACCESSIBLE_FOCUS_BASELINE.md](./ACCESSIBLE_FOCUS_BASELINE.md) |
| Accessible calendar grid | `components/ui/AccessibleCalendarGrid.tsx` | Inline JSDoc |
| Accessible combobox | `components/ui/Combobox.tsx` | Inline JSDoc |
| Semantic status colours | `tailwind.config.js` → `status.*` | [color-contrast-status-semantics-handoff.md](./color-contrast-status-semantics-handoff.md) |
| WCAG contrast helpers | `lib/a11y/wcag-contrast.ts` | Inline JSDoc |
| Chart accessibility | `lib/a11y/chartAccessibility.ts` | Inline JSDoc |
| Notice / alert component | `components/Notice.tsx` | [ARIA_LIVE_REGIONS.md](./ARIA_LIVE_REGIONS.md) |
| Toast / notification | `components/Toast.tsx` | [toast-pattern.md](./toast-pattern.md) |
| Stale data banner | `components/ui/StaleBanner.tsx` | Inline JSDoc |
| Skeleton loading | `components/ui/Skeleton.tsx` | Inline JSDoc |
| Shortcut tooltip | `components/ui/ShortcutTooltip.tsx` | Inline JSDoc |

---

## Common Screen Reader Issues & Fixes

| Issue | What the User Hears | Fix |
|-------|--------------------|-----|
| Missing `alt` on informative image | "Image" or filename | Add descriptive `alt` text |
| Decorative image not hidden | "Image" repeated unnecessarily | Add `aria-hidden="true"` |
| Button without accessible name | "Unlabelled button" | Add `aria-label` or visible text |
| `div` used as button | Nothing (not focusable) | Use `<button>` or add `role="button" tabIndex={0}` with keyboard handler |
| Input without label | "Edit text" (no purpose) | Use `<label htmlFor>` or `aria-label` |
| Skipped heading level | Confusing document outline | Fix heading hierarchy (h1→h2→h3, never skip levels) |
| Dynamic change not announced | User unaware of update | Wrap in `LiveRegion` or add `aria-live` |
| Modal without `aria-modal` | User can navigate behind modal | Add `role="dialog" aria-modal="true"` |
| Custom control without ARIA | State changes not communicated | Add `aria-expanded`, `aria-selected`, `aria-pressed` etc. |
| Too many `aria-live="assertive"` | Constant interruptions | Use `polite` for non-critical updates |

---

## Related Documentation

- **[ARIA_LIVE_REGIONS.md](./ARIA_LIVE_REGIONS.md)** — When to use polite vs assertive live regions
- **[ACCESSIBLE_FOCUS_BASELINE.md](./ACCESSIBLE_FOCUS_BASELINE.md)** — Focus management, focus-visible, and focus trap hooks
- **[FOCUS_TRAPS.md](./FOCUS_TRAPS.md)** — When to trap focus and required escape hatches
- **[a11y-sidebar.md](./a11y-sidebar.md)** — Navigation sidebar accessibility specifics
- **[KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md)** — App-wide keyboard shortcuts
- **[DESIGN_QA_CHECKLIST.md](./DESIGN_QA_CHECKLIST.md)** — Design handoff accessibility checklist
- **[COMPONENT_STATES.md](./COMPONENT_STATES.md)** — Default, hover, focus, disabled, error, loading states
- **[testing.md](./testing.md)** — Test runner guide (Vitest, node:test, Playwright)
- **[TESTING_STANDARDS.md](./TESTING_STANDARDS.md)** — Contributor testing expectations
