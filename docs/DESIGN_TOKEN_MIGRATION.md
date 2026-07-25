# Design Token Migration

**Audience:** contributors renaming, replacing, or retiring a design token.

This document covers the two operations that are easy to get wrong —
**renaming** a token and **deprecating** one — and walks through each with real
examples from this codebase. For the full catalogue of tokens and their semantic
roles see [docs/THEMING.md](THEMING.md), and refer to the
[Design System Roadmap](DESIGN_SYSTEM_ROADMAP.md) for active token deprecations and planned migrations.

---

## Table of Contents

1. [Token locations](#token-locations)
2. [Renaming a token](#renaming-a-token)
3. [Deprecating a token](#deprecating-a-token)
4. [Checklist](#checklist)

---

## Token locations

The design system has two authoritative sources. Both must be kept in sync
whenever a token changes.

| Source | File | Controls |
|--------|------|----------|
| CSS custom properties | `app/globals.css` | Global values consumed by raw CSS (`var(--accent)`, etc.) |
| Tailwind theme extensions | `tailwind.config.js` | Utility class names (`bg-brand-red`, `text-status-error-fg`, etc.) |

Class names are built at **compile time** by Tailwind. A token that no longer
exists in `tailwind.config.js` silently produces no CSS — the class is dropped
without an error, so visual regressions are the only signal. This is why the
steps below require a project-wide search before removing anything.

---

## Renaming a token

Renaming means the old name disappears entirely and every reference is updated
to the new name in a single PR.

### Step 1 — Find every usage

Run a case-sensitive search for the old token name across all source files:

```bash
# Example: renaming brand.red → brand.primary
grep -r "brand-red" app/ components/ lib/ --include="*.tsx" --include="*.ts" --include="*.css" -l
```

Also check plain CSS files and `globals.css` for any `var(--accent)` references
if the matching CSS custom property is also changing.

### Step 2 — Add the new token alongside the old one

In `tailwind.config.js`, add the new token **before** removing the old one so
the build stays green while you update usages:

```js
// tailwind.config.js
colors: {
  brand: {
    red: "#D72323",        // keep until all usages are migrated
    primary: "#D72323",    // new canonical name — same value for now
    redHover: "#B91C1C",
  },
}
```

For a CSS custom property, add the alias in `globals.css`:

```css
:root {
  --accent: #dc2626;         /* keep until all usages are migrated */
  --brand-primary: #dc2626;  /* new canonical name */
}
```

### Step 3 — Update every usage

Replace all occurrences of the old class name with the new one. Real example —
`brand-red` is used in at least these files today:

```
app/not-found.tsx
components/Dashboard/DashboardHeader.tsx
components/Dashboard/WhatsNewPanel.tsx
```

A typical diff for one component:

```diff
- <span className="w-2 h-2 rounded-full bg-brand-red animate-neon-pulse" />
- <span className="text-brand-red text-sm font-semibold tracking-wide">
+ <span className="w-2 h-2 rounded-full bg-brand-primary animate-neon-pulse" />
+ <span className="text-brand-primary text-sm font-semibold tracking-wide">
```

### Step 4 — Remove the old token

Once every reference is gone, delete the old entry from `tailwind.config.js`
and `globals.css`:

```js
// tailwind.config.js — after all usages have been updated
colors: {
  brand: {
    // red: "#D72323",  ← removed
    primary: "#D72323",
    redHover: "#B91C1C",
  },
}
```

### Step 5 — Build and verify

```bash
npm run lint
npm run build
```

A successful build with no lint errors confirms Tailwind did not silently drop
any class. Spot-check the affected components in the browser to confirm the
rendered output is unchanged.

### Step 6 — Update the token catalogue

Update the tables in [docs/THEMING.md](THEMING.md) to reflect the new name.
Remove the old row and add the new one with the same value and semantic role
description. Do this in the same PR as the rename — orphaned documentation
misleads the next contributor.

---

## Deprecating a token

Deprecation is the right choice when a token needs to live on temporarily —
for example when the old name is referenced by a design spec that has not been
updated yet, or when you want a multi-PR migration window.

### Step 1 — Mark the token deprecated in both sources

In `tailwind.config.js`, add a comment:

```js
// tailwind.config.js
colors: {
  brand: {
    /** @deprecated Use `brand.primary` instead. Remove after <target date or issue #>. */
    red: "#D72323",
    primary: "#D72323",   // canonical replacement
    redHover: "#B91C1C",
  },
}
```

In `globals.css`, mark the variable:

```css
:root {
  /* @deprecated – use --brand-primary. Remove after issue #NNN is closed. */
  --accent: #dc2626;
  --brand-primary: #dc2626;
}
```

### Step 2 — Open a tracking issue

File a follow-up issue titled `Remove deprecated token brand.red` and paste the
grep output from Step 1 of [Renaming a token](#renaming-a-token) as the task
list. Reference that issue number in the deprecation comment so it is never
"just a comment":

```js
/** @deprecated Use `brand.primary`. Tracked in #NNN. */
red: "#D72323",
```

### Step 3 — Do not introduce new usages

Add a note to [docs/THEMING.md](THEMING.md) marking the token deprecated:

```markdown
| `brand.red` | `#D72323` | **Deprecated.** Use `brand.primary`. Tracked in #NNN. | `bg-brand-red` |
```

This surfaces in PR reviews: any new `bg-brand-red` in a diff becomes a
conversation starter.

### Step 4 — Complete the migration

When all usages have been replaced — across PRs if necessary — follow Steps 4–6
of [Renaming a token](#renaming-a-token) to remove the old entry and clean up
the documentation.

---

## Real token inventory for reference

The tables below list the tokens most likely to need migration, grouped by
where they are used in the codebase today.

### Status tokens — `components/` and `app/family/`

These tokens appear across `components/Toast.tsx`,
`components/Bills/BillsCard.tsx`, and `app/family/components/`. They follow a
four-variant × four-role pattern. Renaming any one of them requires updating
all four files.

```
status.success.fg      → text-status-success-fg   (progress fill, icon colour)
status.success.bg      → bg-status-success-bg     (badge background)
status.success.border  → border-status-success-border
status.success.soft    → bg-status-success-soft   (toast panel background)

status.error.*         (same four roles — used in FamilyMemberStatCard, BillsCard)
status.warning.*       (same four roles — used in FamilyMemberDetailDrawer, Toast)
status.info.*          (same four roles — available, currently used in info badges)
```

### Brand tokens — `app/` and `components/Dashboard/`

```
brand.red       → bg-brand-red, text-brand-red, border-brand-red/*
brand.dark      → bg-brand-dark   (full-page dark canvas, e.g. app/not-found.tsx)
brand.redHover  → hover:bg-brand-redHover
```

### Semantic spacing tokens — `tailwind.config.js`

```
space-xs  →  gap-space-xs, p-space-xs   (4px)
space-sm  →  space-y-space-sm           (8px)
space-md  →  p-space-md                 (16px)
space-lg  →  gap-space-lg               (24px)
space-xl  →  py-space-xl                (32px)
```

### CSS custom properties — `app/globals.css`

```
--accent           used for CSS-level accent styling (red, #dc2626)
--card             used for card gradient surfaces
--color-bg2        feeds into --card gradient (light: #f8fafc, dark: #0f0f0f)
--color-bg3        feeds into --card gradient (light: #f1f5f9, dark: #0a0a0a)
--foreground-rgb   feeds body text colour via rgb(var(--foreground-rgb))
```

---

## Checklist

Use this as a PR description checklist when renaming or deprecating a token.

**Rename**
- [ ] Searched all source files for the old token name
- [ ] Added the new token in `tailwind.config.js` (and `globals.css` if applicable)
- [ ] Updated every usage to the new class / variable name
- [ ] Removed the old token from `tailwind.config.js` (and `globals.css`)
- [ ] `npm run lint` passes
- [ ] `npm run build` passes with no dropped classes
- [ ] Updated the token table in [docs/THEMING.md](THEMING.md)

**Deprecate**
- [ ] Added `@deprecated` comment with replacement name and tracking issue number
- [ ] Opened a follow-up issue and referenced it in the comment
- [ ] Marked the token deprecated in the [docs/THEMING.md](THEMING.md) table
- [ ] No new usages of the deprecated token introduced in this PR
