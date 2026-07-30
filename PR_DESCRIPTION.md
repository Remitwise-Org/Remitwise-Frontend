# Consolidate Notice and Toast Components

## Summary

This PR consolidates the `Notice` and `Toast` components by refactoring `Notice` to serve as a foundational, reusable base component that `Toast` now composes. This removes duplicate presentation logic, design token mapping, and layout code while preserving identical runtime behavior, animations, accessibility (ARIA roles and live regions), and API contracts for both components.

## Type of Change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix / accessibility improvement
- [x] `refactor` — code cleanup and structural improvement
- [ ] `test` — adding or updating tests
- [ ] `docs` — documentation only

## Scope

- [x] Frontend / Web (`components/Notice.tsx`, `components/Toast.tsx`)
- [ ] CI / Ops

---

## What Changed and Why

### `components/Notice.tsx` Refactored as Base
- Extracted shared UI structure, styling dictionary (`VARIANT_STYLES`), and DOM layout to become the canonical UI base for both components.
- Added support for style overrides (`titleClassName`, `contentClassName`, `iconClassName`) to allow precise stylistic matching when composed by `Toast`.
- Added a `bottomContent` slot to support full-width, unpadded areas like `Toast`'s diagnostics block.
- Maintained its own polite/assertive ARIA roles depending on the variant unless overridden.

### `components/Toast.tsx` Composed via Notice
- Replaced the duplicated UI rendering block with `<Notice>`.
- Preserved all complex lifecycle logic, auto-dismiss functionality, hover-pause interactions, and animations (`animate-slide-in-bottom`, `sm:animate-slide-in-right`).
- Integrated the diagnostics disclosure panel directly into `Notice`'s new `bottomContent` slot.

---

## Verification

### Automated Tests
- Ran the unit tests. `Toast.tsx` and `Notice.tsx` DOM structures and accessibility attributes (`role="status"`, `aria-atomic="true"`, `aria-live`) were preserved seamlessly.

### Linter & Type Check
- Static analysis and visual inspection confirm that the TypeScript types align seamlessly and the components do not introduce breaking styling or accessibility regressions.
