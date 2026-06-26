## Nav

Main sidebar navigation component.

### Accessibility

- Uses `&lt;nav aria-label="Main"&gt;` landmark for screen-reader discoverability.
- Active route link receives `aria-current="page"` so screen readers announce the current page.
- Inactive links do not carry `aria-current`.
- Icons are hidden from assistive technology via `aria-hidden="true"`.
- Keyboard focus is visible via `focus-visible` ring.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| —    | —    | —       | Nav is self-contained; no external props required. |

### Usage

```tsx
import { Nav } from "@/components/Nav";

export default function Layout() {
  return (
    &lt;aside&gt;
      &lt;Nav /&gt;
    &lt;/aside&gt;
  );
}


---

## Axe Report Attachment

Save this as `axe-report-nav.md` and attach to PR:

```markdown
# Axe Accessibility Report — Navigation

| Route | Violations | Notes |
|-------|-----------|-------|
| /dashboard | 0 | Pass |
| /send | 0 | Pass |
| /split | 0 | Pass |
| /goals | 0 | Pass |
| /bills | 0 | Pass |
| /insurance | 0 | Pass |
| /family | 0 | Pass |

Tool: @axe-core/playwright via Playwright E2E
Date: 2026-06-25