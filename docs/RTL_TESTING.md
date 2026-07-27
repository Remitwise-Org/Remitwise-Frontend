# How to Verify Components in an RTL Locale

This guide explains how frontend contributors can test and verify that UI components behave correctly when rendered in a right-to-left (RTL) locale — such as Arabic (`ar`) or Hebrew (`he`).

**Audience:** Frontend contributors building new components or modifying existing layouts, and reviewers checking RTL correctness during code review.

---

## Background

RemitWise targets users in regions that read right-to-left. `app/layout.tsx` ships with `<html lang="en">` and no `dir` attribute by default, so RTL rendering is injected via the test layer rather than through a permanent layout change. The three verification methods below match how the project already does it:

| Method | Tool | When to use |
| :--- | :--- | :--- |
| **Unit / component test** | Vitest + `@testing-library/react` | Checking rendering logic and `dir`-dependent output inside a single component |
| **Visual (Storybook)** | Storybook + `RtlWrapper` decorator | Inspecting layout and typography side-by-side without running the full app |
| **End-to-end** | Playwright + `addInitScript` | Catching full-page layout breaks and running axe accessibility checks under RTL |

---

## Core RTL Acceptance Criteria

Before merging any component that affects layout, typography, or numeric formatting, verify the following:

1. **Text direction flows right-to-left** — inline text, labels, and icons should start from the right edge when `dir="rtl"` is set on an ancestor.
2. **No horizontal overflow** — `document.documentElement.scrollWidth` must not exceed `document.documentElement.clientWidth` in RTL mode.
3. **Numeric and currency values are formatted correctly** — `<FormattedCurrency>` and `<FormattedNumber>` pass an explicit `locale` prop (e.g. `"ar-SA"`) so `Intl.NumberFormat` produces locale-appropriate number separators and currency placement.
4. **Zero axe violations** — the existing `tests/e2e/rtl-layout.spec.ts` must continue to pass with no new violations introduced.
5. **No hard-coded directional CSS** — do not add `margin-left`, `padding-left`, `float: left`, or `text-align: left` values in isolation. If you need directional spacing, use Tailwind's `rtl:` variant (e.g. `ltr:ml-2 rtl:mr-2`) or a logical property (`ms-2`).

---

## Method A: Unit / Component Test (Vitest)

Use this when you want to assert specific DOM output under RTL rendering.

### Wrap with `RtlWrapper`

The helper lives in `components/i18n/rtlDecorator.tsx` and sets `dir="rtl" lang="ar"` on a wrapper `<div>`.

```tsx
// tests/unit/components/MyCard.rtl.test.tsx
import { render, screen } from "@testing-library/react";
import { RtlWrapper } from "@/components/i18n/rtlDecorator";
import { MyCard } from "@/components/MyCard";

describe("MyCard – RTL", () => {
  it("renders action button text without clipping under dir=rtl", () => {
    render(
      <RtlWrapper>
        <MyCard title="إرسال الأموال" amount={500} currency="USD" />
      </RtlWrapper>
    );

    // The button must still be reachable and labelled correctly
    const btn = screen.getByRole("button", { name: /إرسال/i });
    expect(btn).toBeInTheDocument();
  });

  it("sets dir=rtl on the wrapper element", () => {
    const { container } = render(
      <RtlWrapper>
        <span>test</span>
      </RtlWrapper>
    );

    expect(container.firstElementChild).toHaveAttribute("dir", "rtl");
    expect(container.firstElementChild).toHaveAttribute("lang", "ar");
  });
});
```

### Override the locale for `<FormattedCurrency>`

`<FormattedCurrency>` accepts a `locale` prop that bypasses the user-preference hook, making it straightforward to test RTL number formatting:

```tsx
import { render, screen } from "@testing-library/react";
import { FormattedCurrency } from "@/components/i18n/FormattedCurrency";
import { RtlWrapper } from "@/components/i18n/rtlDecorator";

it("formats USD in Arabic locale under RTL wrapper", () => {
  render(
    <RtlWrapper>
      <FormattedCurrency value={9999.99} currency="USD" locale="ar-SA" />
    </RtlWrapper>
  );

  // The span is present; exact numeral format depends on the runtime's Intl
  // implementation, so assert structure rather than an exact string.
  const span = document.querySelector("[data-i18n-locale='ar-SA']");
  expect(span).toBeTruthy();
  expect(span?.textContent?.length).toBeGreaterThan(0);
});
```

### Run the test

```bash
npm run test:unit:vitest
```

---

## Method B: Visual Verification (Storybook)

Use Storybook to inspect layout and typography without running the full Next.js dev server.

### Using the per-story `rtlDecorator`

`components/i18n/rtlDecorator.tsx` exports three utilities:

| Export | Description |
| :--- | :--- |
| `RtlWrapper` | React component — wrap children in `<div dir="rtl" lang="ar">` |
| `withRtl` | Storybook decorator — zero-config wrapper for a whole story |
| `rtlDecorator(lang, direction)` | Factory that returns a decorator; useful when you need a specific language tag |

Add an RTL story to any component's `.stories.tsx` file:

```tsx
// components/MyCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { rtlDecorator } from "@/components/i18n/rtlDecorator";
import { MyCard } from "./MyCard";

const meta = {
  title: "Components/MyCard",
  component: MyCard,
} satisfies Meta<typeof MyCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: "Send Money", amount: 500, currency: "USD" },
};

/**
 * RTL preview — Arabic locale. Confirm text starts at the right edge and
 * the action button is reachable without layout overlap.
 */
export const ArabicRtl: Story = {
  args: { title: "إرسال الأموال", amount: 500, currency: "USD" },
  decorators: [rtlDecorator("ar", "rtl")],
};
```

**What to look for when you open the story:**

- The card title starts at the right edge of the container.
- The action button label is fully visible and not clipped.
- No element bleeds outside the card boundary (use the Storybook outline add-on to spot this quickly).
- Currency values (if any) use the correct numeral group separator for the locale.

### Run Storybook locally

```bash
npm run storybook
```

Open [http://localhost:6006](http://localhost:6006), navigate to the story, and select the **ArabicRtl** variant.

The existing `FormattedCurrency → ArabicRtlPreview` story in `components/i18n/FormattedCurrency.stories.tsx` shows the established pattern and is a useful reference.

---

## Method C: End-to-End Test (Playwright)

Use Playwright to verify full-page layout under RTL and run automated accessibility checks.

### How RTL is injected

Because `app/layout.tsx` does not set `dir` at runtime, tests inject it via `page.addInitScript` which runs before any page script executes:

```typescript
await page.addInitScript(() => {
  document.documentElement.setAttribute("dir", "rtl");
});
```

This is exactly what the existing `rtlPage` fixture in `tests/e2e/rtl-layout.spec.ts` does.

### Extending the existing RTL spec

The existing spec checks `/dashboard`, `/send`, and `/split` for axe violations. To add your new route:

```typescript
// tests/e2e/rtl-layout.spec.ts  (existing file — add your route to this array)
const routes = [
  "/dashboard",
  "/send",
  "/split",
  "/bills",   // ← add your route here
];
```

### Writing a standalone RTL layout check

If your component lives on a route not yet covered, add a dedicated spec:

```typescript
// tests/e2e/rtl-my-feature.spec.ts
import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const test = base.extend({
  rtlPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      document.documentElement.setAttribute("dir", "rtl");
    });
    await use(page);
  },
});

test("RTL layout has zero axe violations on /my-route", async ({ rtlPage }) => {
  await rtlPage.goto("/my-route");
  await rtlPage.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page: rtlPage }).analyze();
  expect(results.violations).toEqual([]);
});

test("no horizontal overflow under RTL on /my-route", async ({ rtlPage }) => {
  await rtlPage.goto("/my-route");
  await rtlPage.waitForLoadState("networkidle");

  const hasOverflow = await rtlPage.evaluate(() => {
    return (
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
    );
  });
  expect(hasOverflow).toBe(false);
});
```

### Run the E2E tests

```bash
# Run only the RTL spec
npm run test:e2e -- tests/e2e/rtl-layout.spec.ts

# Run the full E2E suite
npm run test:e2e
```

The development server must be running (`npm run dev`) or the Playwright `webServer` configuration in `playwright.config.ts` will start it for you.

---

## Authoring Components for RTL

These patterns let you write layout code once that works in both directions.

### Use Tailwind logical-property variants

Tailwind's `rtl:` variant applies a class only when an ancestor has `dir="rtl"`. Pair it with the LTR equivalent:

```tsx
// ❌  hard-coded direction
<div className="ml-4">

// ✅  direction-aware
<div className="ltr:ml-4 rtl:mr-4">

// ✅  even better — use logical properties (ms = margin-inline-start)
<div className="ms-4">
```

**Note:** The `rtl:` variant is available in Tailwind CSS v3. Check `tailwind.config.js` before using it; if it is not in the `plugins` or `variants` list, use logical-property classes (`ms-`, `me-`, `ps-`, `pe-`) instead, as those work without plugin changes.

### Do not hard-code `text-align`

```tsx
// ❌
<p className="text-left">Balance</p>

// ✅  inherits from dir="rtl" automatically
<p>Balance</p>

// ✅  explicit logical alignment
<p className="text-start">Balance</p>
```

### Respect the design token system

Never override colours, spacing, or radii with raw values. Use the CSS custom properties and Tailwind tokens defined in `docs/THEMING.md`:

```tsx
// ❌
<div style={{ marginRight: "16px" }}>

// ✅
<div className="me-4">
```

### Pass `locale` to formatting components explicitly in tests

`useFormatter` / `useClientLocale` resolve the locale from the cookie. In isolated tests there is no cookie, so the hook defaults to `"en"`. Pass the locale prop directly:

```tsx
<FormattedCurrency value={1000} currency="USD" locale="ar-SA" />
```

---

## RTL Checklist for Code Review

Before approving a PR that touches layout or i18n:

- [ ] Component renders without horizontal overflow under `dir="rtl"`.
- [ ] Text direction reverses correctly — no hard-coded `text-left` or `margin-left` without an `rtl:` counterpart.
- [ ] `<FormattedCurrency>` / `<FormattedNumber>` accept the `locale` prop and produce correct output for `ar-SA` or `he-IL`.
- [ ] A Storybook RTL story exists (or an existing one was updated) using `rtlDecorator` or `withRtl`.
- [ ] The E2E axe check in `tests/e2e/rtl-layout.spec.ts` passes — either the route is covered already or a new test was added.
- [ ] No raw CSS directional values were introduced (`float: left`, `direction: ltr`, hard-coded `padding-left`, etc.).

---

## Related Documentation

- [Responsive Testing Guide](./RESPONSIVE_TESTING.md) — verifying layouts across viewport widths.
- [THEMING.md](./THEMING.md) — CSS custom properties and Tailwind tokens.
- [COMPONENTS.md](./COMPONENTS.md) — component catalogue and prop conventions.
- [testing.md](./testing.md) — full multi-runner reference (Vitest, Playwright, Storybook).
- [ACCESSIBLE_FOCUS_BASELINE.md](./ACCESSIBLE_FOCUS_BASELINE.md) — WCAG focus-ring and accessibility baseline.

Source files referenced in this guide:
- [`components/i18n/rtlDecorator.tsx`](../components/i18n/rtlDecorator.tsx) — `RtlWrapper`, `withRtl`, `rtlDecorator`
- [`components/i18n/FormattedCurrency.tsx`](../components/i18n/FormattedCurrency.tsx) — locale-aware currency renderer
- [`components/i18n/FormattedCurrency.stories.tsx`](../components/i18n/FormattedCurrency.stories.tsx) — includes `ArabicRtlPreview` story
- [`tests/e2e/rtl-layout.spec.ts`](../tests/e2e/rtl-layout.spec.ts) — existing axe-based RTL E2E spec
- [`lib/i18n/resolve-locale.ts`](../lib/i18n/resolve-locale.ts) — locale resolution precedence
