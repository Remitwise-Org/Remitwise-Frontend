# Semantic Tokens & Contrast Ratios

**Audience:** contributors adding or modifying UI components, design tokens, or colour values.

---

## Table of Contents

1. [What are semantic tokens?](#what-are-semantic-tokens)
2. [Token architecture](#token-architecture)
3. [Contrast ratio requirements](#contrast-ratio-requirements)
4. [Verifying contrast ratios](#verifying-contrast-ratios)
5. [How to add a new colour token](#how-to-add-a-new-colour-token)
6. [Common pitfalls](#common-pitfalls)
7. [Checklist](#checklist)

---

## What are semantic tokens?

A semantic token is a named design value whose name describes its **role** rather
than its raw value. Instead of writing `#D72323` everywhere, you write
`bg-brand-red`. The value lives in one place (`tailwind.config.js`), and the
name tells reviewers **why** you chose that colour.

RemitWise semantic tokens fall into four families:

| Family | Source | Example class | What it communicates |
|--------|--------|---------------|----------------------|
| **Brand** | `tailwind.config.js` → `colors.brand` | `bg-brand-red`, `text-brand-dark` | Brand identity (red accent, dark canvas) |
| **Status** | `tailwind.config.js` → `colors.status` | `text-status-error-fg`, `bg-status-success-bg` | Meaning of a UI state (error, warning, success, info) |
| **Primary** | `tailwind.config.js` → `colors.primary` | `bg-primary-600`, `text-primary-300` | Scale of informational blues |
| **Spacing** | `tailwind.config.js` → `spacing` | `gap-space-md`, `h-11` | Spatial relationships (compact, default, generous) |

Status tokens are the most important for accessibility: they carry meaning
(overdue bill, active policy) that must survive without colour perception. Every
status badge **must** include both an icon and a text label — never colour
alone (WCAG 2.1 AA, SC 1.4.1).

For the full token catalogue, see [docs/THEMING.md](THEMING.md). For migration
procedures, see [docs/DESIGN_TOKEN_MIGRATION.md](DESIGN_TOKEN_MIGRATION.md).

---

## Token architecture

RemitWise tokens live in two layers. Both must be kept in sync.

### Layer 1: CSS custom properties (`app/globals.css`)

Global browser-level values consumed by raw CSS or `var()` references:

```css
:root {
  --skeleton-static: rgba(0, 0, 0, 0.08);
  --skeleton-base: rgba(0, 0, 0, 0.06);
  --skeleton-highlight: rgba(0, 0, 0, 0.14);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #010101;
    --color-bg2: #0f0f0f;
    --color-bg3: #0a0a0a;
    --card: linear-gradient(var(--color-bg2), var(--color-bg3));
    --accent: #dc2626;
  }
}
```

Use CSS custom properties **only** when a value must exist outside Tailwind
class composition (e.g., skeleton gradient animation, theme-styleable cards).

### Layer 2: Tailwind theme extensions (`tailwind.config.js`)

Compile-time token classes for component styling in JSX:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      brand: {
        red: "#D72323",
        dark: "#0A0A0A",
        redHover: "#B91C1C",
      },
      status: {
        success: { fg: "#86EFAC", bg: "rgba(34, 197, 94, 0.14)", /* ... */ },
        warning: { fg: "#FDE68A", bg: "rgba(245, 158, 11, 0.14)", /* ... */ },
        error:   { fg: "#FDA4AF", bg: "rgba(244, 63, 94, 0.14)",  /* ... */ },
        info:    { fg: "#93C5FD", bg: "rgba(59, 130, 246, 0.14)",  /* ... */ },
      },
    },
  },
}
```

Tailwind generates utility classes from these at build time:
`bg-status-success-bg`, `text-status-warning-fg`, `border-status-error-border`,
etc. If you remove a token without updating all usages, Tailwind **silently**
drops the class — the only signal is a visual regression.

---

## Contrast ratio requirements

RemitWise targets **WCAG 2.1 AA** as a minimum for all UI text. The constants
live in `lib/a11y/wcag-contrast.ts`:

| Threshold | Constant | Value | Applies to |
|-----------|----------|-------|------------|
| AA normal | `WCAG_AA_NORMAL` | `4.5:1` | Body text, labels, form controls, status badges (< 18pt) |
| AA large   | `WCAG_AA_LARGE`  | `3.0:1` | Headings ≥ 18pt, bold text ≥ 14pt, icons, divider lines, chart elements |
| AAA normal | `WCAG_AAA_NORMAL` | `7.0:1` | Aspirational — not required but preferred when achievable |

### What must pass AA normal (≥ 4.5:1)

- Body text on background surfaces
- Status badge text (e.g. "Overdue", "Paid")
- Form input labels and values
- Button labels (the text inside the button)
- Tooltip text
- Toast message text

### What may use AA large (≥ 3.0:1)

- Large headings (≥ 18pt / 24px)
- Icon strokes
- Chart series colours (bars, lines, legend swatches)
- Decorative divider lines
- The brand-red accent as an icon or graphic element (but **not** as body text)

These thresholds are enforced by unit tests in
`tests/unit/a11y/wcag-contrast.test.ts`. Every foreground/background pair listed
in that file represents a real RemitWise UI pairing. When you add new tokens,
you must add the corresponding test pairs.

---

## Verifying contrast ratios

You have three ways to check contrast ratios. Use whichever fits your workflow.

### 1. Vitest unit tests (recommended for PRs)

The canonical assertion lives in `tests/unit/a11y/wcag-contrast.test.ts`. Run it
with:

```bash
npx vitest run tests/unit/a11y/wcag-contrast.test.ts
```

The test imports helpers from `lib/a11y/wcag-contrast.ts` and asserts every
design-token pair meets its expected WCAG level. Add new pairs when you add
new tokens.

### 2. WCAG contrast script (quick spot-checks)

The Python script at `scripts/wcag_contrast.py` checks the most common pairs
against a built-in colour set:

```bash
python3 scripts/wcag_contrast.py
```

Output:

```
WCAG contrast report:

white (#ffffff) on background (#141414) -> 18.42: AAA
gray400 (#9CA3AF) on background (#141414) -> 7.26: AAA
white (#ffffff) on gradient2 (#0a0a0a) -> 19.80: AAA
brand_red (#D72323) on background (#141414) -> 3.64: AA Large (>=3)
brand_red (#D72323) on surface (#1a1a1a) -> 3.44: AA Large (>=3)
white (#ffffff) on brand_red (#D72323) -> 5.06: AA
gray100 (#F3F4F6) on track (#1F1F1F) -> 14.98: AAA
white (#ffffff) on track (#1F1F1F) -> 16.48: AAA
```

When adding a new colour, add it to the `colors` dict and list the relevant
foreground/background pairs.

### 3. Programmatic helpers

Import contrast helpers directly in tests or scripts:

```ts
import { contrastRatio, meetsWcagAA, wcagLevel } from "@/lib/a11y/wcag-contrast";

// One-off check
const ratio = contrastRatio("#D72323", "#141414");
console.log(ratio); // 3.64

// Boolean assertion for normal text
meetsWcagAA("#ffffff", "#141414");   // true (18.42:1)
meetsWcagAA("#9CA3AF", "#141414");   // true (7.26:1)

// Classification
wcagLevel("#ffffff", "#D72323");     // "AA" (5.06:1)
wcagLevel("#D72323", "#141414");     // "AA_LARGE" (3.64:1 — large text only)
```

**Only use the programmatic helpers in tests or build scripts.** Do not run
contrast calculations at runtime in the browser bundle — they add weight and
are unnecessary when the tokens are verified at build time.

---

## How to add a new colour token

Adding a colour token is a four-step process. Follow these steps in a single PR.

### Step 1: Add the token to `tailwind.config.js`

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      status: {
        neutral: {                              // ← new semantic group
          fg: "#D1D5DB",                        // foreground text
          bg: "rgba(107, 114, 128, 0.14)",       // badge background
          border: "rgba(107, 114, 128, 0.28)",   // badge border
          soft: "rgba(55, 65, 81, 0.28)",        // panel surface
        },
      },
    },
  },
}
```

**Never hard-code a colour in a component when a token already serves the same
role.** If you need a new colour, add it as a token first.

### Step 2: Add CSS custom properties if needed

If the token is consumed by raw CSS (not just Tailwind classes), add the
corresponding custom property in `app/globals.css`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --status-neutral-fg: #D1D5DB;
    --status-neutral-bg: rgba(107, 114, 128, 0.14);
  }
}
```

### Step 3: Verify contrast ratios

Add test pairs to `tests/unit/a11y/wcag-contrast.test.ts`:

```ts
const STATUS_FG = {
  // existing tokens...
  neutralFg: "#D1D5DB",   // ← added
} as const;

// In the WCAG AA normal-text describe block:
[STATUS_FG.neutralFg, STATUS_BG.surface, "status-neutral-fg on surface"],
```

Then run the contrast tests:

```bash
npx vitest run tests/unit/a11y/wcag-contrast.test.ts
```

If the ratio fails, adjust the colour values until they pass. Do **not** skip
the test or lower the threshold — your colour values are wrong.

### Step 4: Update the token catalogue

Add the new token to the "Status Colors" table in
[docs/THEMING.md](THEMING.md):

```markdown
| `status.neutral.fg` | `#D1D5DB` | Neutral status text or icon. | `text-status-neutral-fg` |
| `status.neutral.bg` | `rgba(107, 114, 128, 0.14)` | Neutral badge background. | `bg-status-neutral-bg` |
```

---

## Common pitfalls

### Pitfall 1: Using opaque equivalents for semi-transparent backgrounds

Status background tokens like `status.success.bg` are semi-transparent
(`rgba(34, 197, 94, 0.14)`). They are designed to composite over the dark
canvas. When checking contrast ratios for the foreground text on these
backgrounds, use the **actual rendered background colour**, not a guessed solid
equivalent.

The contrast test file uses `BG.surface` (`#1a1a1a`) as the effective background
for semi-transparent status fills because that is the dark surface they overlay:

```ts
// Correct: checking status fg text against the dark surface it renders over
[STATUS_FG.successFg, STATUS_BG.surface, "status-success-fg on surface"],
```

### Pitfall 2: Using status fg colours as body text on dark backgrounds

Status foreground colours like `#86EFAC` (success-fg) are designed to be used
in **status badges** on dark surfaces. They are not intended as general body
text on the app background. Always use `text-white` or gray scale tones for body
copy.

### Pitfall 3: Conveying state with colour alone

Status colours are a supplement, not the sole differentiator. Every status badge
must include:

```tsx
// ❌ Wrong — colour only, fails WCAG 1.4.1
<span className="text-status-error-fg">Overdue</span>

// ✅ Correct — icon + label, colour is supplementary
<span className="flex items-center gap-space-xs text-status-error-fg">
  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
  Overdue
</span>
```

### Pitfall 4: Hard-coding focus ring colours

Focus rings are defined globally in `app/globals.css`:

```css
*:focus-visible {
  outline: 2px solid #D72323 !important;
  outline-offset: 2px !important;
}
```

Do not override this in individual components. The global rule ensures
consistent, high-contrast focus indication everywhere. If you need a component
to participate in focus-visible, use `focus-visible:ring-focus` and
`focus-visible:ring-offset-focus` Tailwind tokens for the ring width and offset.

### Pitfall 5: Using `gray-400` text when `white` is needed

`text-gray-400` meets AA large-text (≥ 3:1) on dark backgrounds but does **not**
meet AA normal-text in every case. Use it only for supplementary metadata, not
primary content. Body text and important labels must use `text-white` or
equivalent tokens that meet ≥ 4.5:1.

---

## Related documentation

- [docs/THEMING.md](THEMING.md) — full token catalogue (colours, spacing, animations, breakpoints)
- [docs/DESIGN_TOKEN_MIGRATION.md](DESIGN_TOKEN_MIGRATION.md) — how to rename or deprecate a token
- [docs/SPACING_TOKENS.md](SPACING_TOKENS.md) — semantic and fine-grained spacing tokens
- [docs/ELEVATION.md](ELEVATION.md) — elevation and shadow tokens for surface hierarchy
- [docs/color-contrast-status-semantics-handoff.md](color-contrast-status-semantics-handoff.md) — design handoff for bills/insurance status semantics
- [docs/DESIGN_SYSTEM_ROADMAP.md](DESIGN_SYSTEM_ROADMAP.md) — planned components and active deprecations
- `lib/a11y/wcag-contrast.ts` — TypeScript contrast-ratio helpers
- `scripts/wcag_contrast.py` — quick Python contrast checker
- `tests/unit/a11y/wcag-contrast.test.ts` — automated contrast contract for all design tokens

---

## Checklist

Use this as a PR checklist when adding or changing a colour token:

- [ ] Token added to `tailwind.config.js` under the correct semantic group
- [ ] CSS custom property added to `app/globals.css` if needed for raw CSS
- [ ] Foreground/background test pairs added to `tests/unit/a11y/wcag-contrast.test.ts`
- [ ] `npx vitest run tests/unit/a11y/wcag-contrast.test.ts` passes
- [ ] All status badges in affected components include both an icon **and** a text label
- [ ] New token documented in the [docs/THEMING.md](THEMING.md) token tables
- [ ] No hard-coded colour values introduced in component JSX
- [ ] `npm run lint` and `npm run build` pass
