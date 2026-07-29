# Typography Scale

## Audience

This guide is for **contributors** adding or editing components in the RemitWise
frontend. It documents the typographic tokens available and how to use them
consistently.

## Overview

RemitWise uses **Tailwind CSS's default typography scale** — no custom
`fontSize`, `fontWeight`, or `lineHeight` extensions are defined in
`tailwind.config.js`. Every Tailwind text utility maps to a fixed set of
`font-size` / `line-height` pairs designed around a consistent baseline grid.

Contributors should reuse these built-in utilities rather than reaching for
arbitrary values (e.g. `text-[17px]`). When the scale doesn't meet a specific
design need, discuss adding a custom step in `tailwind.config.js` before
using a one-off value.

No custom `fontFamily` is defined, so the project inherits Tailwind's
cross-platform system font stack (see [Font Family](#font-family)).

## Font Sizes

Each Tailwind font-size utility ships with a paired line-height. The table
below lists every size available (no project-level overrides exist).

| Class | `font-size` | `line-height` | Typical usage in this project |
|---|---|---|---|
| `text-xs` | 0.75rem (12px) | 1rem (16px) | Badges, labels, helper text, table metadata, `<time>` timestamps |
| `text-sm` | 0.875rem (14px) | 1.25rem (20px) | Body text, form labels, descriptions, sub-navigation links |
| `text-base` | 1rem (16px) | 1.5rem (24px) | Primary body copy, paragraph text |
| `text-lg` | 1.125rem (18px) | 1.75rem (28px) | Section headings (`<h2>`), card titles |
| `text-xl` | 1.25rem (20px) | 1.75rem (28px) | Dialog titles, page headings (mobile), stat labels |
| `text-2xl` | 1.5rem (24px) | 2rem (32px) | Page headings (`<h1>`), section banners |
| `text-3xl` | 1.875rem (30px) | 2.25rem (36px) | Dashboard metrics, stats cards |
| `text-4xl` | 2.25rem (36px) | 2.5rem (40px) | Hero / landing page headings |
| `text-5xl` | 3rem (48px) | 1 | Display headings (no built-in line-height; pair with `leading-tight`) |
| `text-6xl` | 3.75rem (60px) | 1 | Large display type |
| `text-7xl` | 4.5rem (72px) | 1 | Hero display type |
| `text-8xl` | 6rem (96px) | 1 | Ultra display type |
| `text-9xl` | 8rem (128px) | 1 | Maximum display type |

## Line Heights

Tailwind's relative line-height utilities (`leading-*`) override the default
pairing that ships with each font-size class.

| Class | Value | Typical usage |
|---|---|---|
| `leading-none` | 1 | Large numeric values, display text, stat cards |
| `leading-tight` | 1.25 | Compact headings (`text-5xl` and above) |
| `leading-snug` | 1.375 | Tight headings |
| `leading-normal` | 1.5 | Default body copy (matches `text-base`) |
| `leading-relaxed` | 1.625 | Long-form descriptive content, multi-line paragraphs |
| `leading-loose` | 2 | Spaced-out prose, legal text |

Fixed line-height utilities (`leading-4` through `leading-10`) are also
available but rarely needed. Prefer the relative utilities above.

## Font Weights

| Class | Numeric weight | Usage |
|---|---|---|
| `font-thin` | 100 | Decorative / display only (rare) |
| `font-extralight` | 200 | Decorative / display only (rare) |
| `font-light` | 300 | Subtle emphasis in large headings |
| `font-normal` | 400 | Standard body copy, paragraph text |
| `font-medium` | 500 | Interactive labels, button text, form controls |
| `font-semibold` | 600 | Section headings, card titles, emphasis |
| `font-bold` | 700 | Primary page headings, key metrics, hero text |
| `font-extrabold` | 800 | Strong emphasis on stats / numbers |
| `font-black` | 900 | Ultra-bold display emphasis (rare) |

### Weight usage conventions in the codebase

Based on actual usage across RemitWise components:

- **`font-bold`** — page titles (`<h1>`), logo text, hero headings, metric
  numbers (e.g. `"text-2xl font-bold"`).
- **`font-semibold`** — section headings (`<h2>`), card titles, stat labels,
  member names, approval badges.
- **`font-medium`** — navigation links, button text, interactive controls,
  inline emphasis.
- **`font-normal`** — body copy, descriptions, supporting text.
- **`font-extrabold`** — large display numbers (e.g. transaction amounts on
  receipt pages: `"text-5xl font-extrabold"`).

## Font Family

No custom `fontFamily` is configured. The project uses Tailwind's default
cross-platform system font stack:

```
font-sans:
  ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",
  "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"

font-mono:
  ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
  "Liberation Mono", "Courier New", monospace
```

- **`font-sans`** (default) — all UI text: headings, body, labels, buttons.
- **`font-mono`** — Stellar addresses, transaction hashes, code-like values
  (e.g. `AddressDisplay`, `TransactionProofCard`).

## Letter Spacing (Tracking)

| Class | Value | Usage |
|---|---|---|
| `tracking-tight` | -0.025em | Headings, logo text, large numbers |
| `tracking-normal` | 0 | Default body copy |
| `tracking-wide` | 0.025em | Uppercase labels (rare) |
| `tracking-[0.12em]` | custom | Uppercase badge text (used in `ApprovalRequestCard`) |
| `tracking-[0.14em]` | custom | Uppercase section labels (used in `FamilyMemberSection`) |
| `tracking-[0.18em]` | custom | Uppercase category headers (used in stat cards) |
| `tracking-[0.24em]` | custom | Wide uppercase section overline labels |

> Prefer `tracking-tight` for headings and `tracking-normal` for body text.
> Custom tracking values above 0.1em should only be used for all-caps micro-labels
> consistent with existing patterns.

## Text Color Conventions

All text color should use existing tokens — never hardcode new values.

| Role | Token | Example |
|---|---|---|
| Primary heading / body | `text-white` | `"text-white"` |
| Secondary / supporting | `text-gray-400` | `"text-sm text-gray-400"` |
| Muted / tertiary | `text-gray-500` or `text-white/40` | `"text-xs text-gray-500"` |
| Brand accent (headline highlight) | `text-brand-red` (`#D72323`) or `text-red-600` (`#DC2626`) | `"text-brand-red"`, `"text-[#DC2626]"` |
| Status success | `text-status-success-fg` | `"text-status-success-fg"` |
| Status warning | `text-status-warning-fg` | `"text-status-warning-fg"` |
| Status error | `text-status-error-fg` | `"text-status-error-fg"` |
| Status info | `text-status-info-fg` | `"text-status-info-fg"` |

## Real Examples from the Codebase

These examples are pulled directly from RemitWise components — not placeholders.

### Page heading with back button (`components/PageHeader.tsx`)

```tsx
<PageHeadingLink
  headingId="bills-page-heading"
  label="Bills"
  headingClassName="break-words text-xl font-bold text-white sm:text-2xl"
>
  Bills
</PageHeadingLink>
<p className="mt-0.5 break-words text-sm text-gray-400">
  Manage recurring bills and one-time payments
</p>
```

### Family member section heading (`app/family/components/FamilyMemberSection.tsx`)

```tsx
<p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
  Family Members
</p>
<h2 className="mt-3 text-2xl font-semibold text-white">
  Manage Your Family
</h2>
<p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
  Add family members, set spending limits, and manage permissions.
</p>
```

### Approval request badge and label (`app/family/components/ApprovalRequestCard.tsx`)

```tsx
<span className="rounded-full border border-status-warning-border bg-status-warning-bg
                 px-3 py-1 text-xs font-semibold text-status-warning-fg">
  Pending
</span>
```

### Transaction receipt amount (`components/TransactionProofCard.tsx`)

```tsx
<span className="text-5xl font-extrabold text-gray-900 tracking-tight">
  {formatAmount(amount)}
</span>
<span className="text-xl text-gray-400 font-medium ml-2">
  {currency}
</span>
```

### Dashboard last-synced indicator (`app/dashboard/page.tsx`)

```tsx
<span className="text-xs text-gray-500">
  Updated 5 min ago
</span>
```

### Navigation link (`components/Nav/PrimaryNav.tsx`)

```tsx
<span className="text-sm font-medium">
  {link.label}
</span>
```

## When to Use Arbitrary Values

Avoid arbitrary font sizes (e.g. `text-[17px]`). If a design requires a
value not in the default scale, follow this decision tree:

1. **Can the closest Tailwind size work?** — Try `text-sm` before `text-[13px]`.
2. **Is it a new global step?** — Propose adding it to `theme.extend.fontSize`
   in `tailwind.config.js` in the same PR.
3. **Is it truly one-off?** — Use the arbitrary syntax as a last resort and
   document it with a comment referencing the design spec.

## Rationale

- **Consistency:** Reusing Tailwind's standard scale means every contributor
  can predict which class to reach for. No custom scale layer means no
  additional learning curve for new contributors.
- **Accessibility:** Tailwind's default line-height pairings meet WCAG 2.1 AA
  minimums for text spacing (SC 1.4.12). The minimum font size of 12px
  (`text-xs`) avoids readability issues on mobile.
- **Performance:** No custom `fontSize` theme extensions mean zero additional
  CSS generated beyond Tailwind's built-in utilities. This keeps the CSS
  bundle lean.
- **Baseline grid:** Every size pairs with a line-height that sits on a
  4px-based grid, keeping vertical rhythm predictable.
- **When in doubt, match existing patterns.** Browse nearby components to
  see which utilities the page already uses before introducing a different
  size or weight.
