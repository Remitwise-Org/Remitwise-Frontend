# Icon System

This guide covers everything you need to use an existing icon or add a brand-new one to the codebase. It is written for contributors working in this repo.

---

## Overview

RemitWise uses [**Lucide React**](https://lucide.dev) (`lucide-react ^0.575.0`) as its icon library. Lucide is already the library for every navigation, action, feedback, and status icon in the product UI.

One legacy outlier exists: `components/Hero.tsx` imports `LightningBoltIcon` from `@radix-ui/react-icons` for a single CTA accent. That usage is flagged for normalisation — see [docs/iconography-guidelines-handoff.md](iconography-guidelines-handoff.md) for context. Do not introduce additional `@radix-ui/react-icons` usages; use the Lucide equivalent instead (e.g. `Zap`).

---

## Using an existing icon

### Import

All Lucide icons are named imports from the `lucide-react` package. There is no barrel re-export — import directly.

```tsx
import { Send, ArrowLeft, CheckCircle2 } from "lucide-react";
```

### Render as JSX

Place the icon component inline. Apply size via Tailwind classes (see [Sizing](#sizing)).

```tsx
// Decorative icon paired with visible text — aria-hidden keeps it off the a11y tree
<button type="button" className="flex items-center gap-2">
  <Send className="w-4 h-4" aria-hidden="true" />
  Send money
</button>
```

### Icon-only buttons

When there is no visible label, add an `aria-label` so the control has an accessible name.

```tsx
<button type="button" aria-label="Copy address">
  <Copy className="w-4 h-4" />
</button>
```

### Passing an icon as a prop

Use the `LucideIcon` type when a component accepts an icon as a prop. The component receives the class as a constructor reference and renders it.

```tsx
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
}

export default function EmptyState({ icon: Icon, title }: EmptyStateProps) {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DC2626]/10 text-[#DC2626]">
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
  );
}
```

Real example: `components/ui/WidgetEmptyState.tsx`.

### Icon-to-status mapping (config pattern)

For components that switch icons based on state, use a lookup map rather than a switch statement. This keeps the icon name, colour, and spin behaviour co-located and avoids render-time conditionals.

```tsx
import { AlertCircle, CheckCircle2, Clock3, Loader2 } from "lucide-react";

const statusStyles = {
  idle:    { Icon: Clock3,        iconClass: "text-gray-300", spin: false },
  pending: { Icon: Loader2,       iconClass: "text-red-200",  spin: true  },
  success: { Icon: CheckCircle2,  iconClass: "text-emerald-300", spin: false },
  error:   { Icon: AlertCircle,   iconClass: "text-amber-200",   spin: false },
} as const;

const { Icon, iconClass, spin } = statusStyles[status];

<Icon
  className={`h-4 w-4 ${iconClass} ${spin ? "animate-spin" : ""}`}
  aria-hidden="true"
/>
```

Real example: `components/AsyncSubmissionStatus.tsx`.

---

## Sizing

There is no custom size prop — size is applied through Tailwind width/height utilities directly on the icon element.

### Standard size grid

| Size | Tailwind classes | When to use |
|------|-----------------|-------------|
| 14 px | `w-3.5 h-3.5` | Compact status pills (e.g. `size="sm"` variant) |
| 16 px | `w-4 h-4` | Default: inline metadata, copy buttons, trend arrows, utility controls |
| 20 px | `w-5 h-5` | Primary header actions, mobile nav icons |
| 24 px | `h-6 w-6` | Feature/empty-state icons, onboarding callouts |

`w-4 h-4` (16 px) is the default. When in doubt, start there.

### Icon containers

Wrap an icon in a container element when it needs a coloured background or touch target. Standard container sizes:

| Container | Tailwind classes | Use |
|-----------|-----------------|-----|
| 40 px | `h-10 w-10` | Standard utility button touch target |
| 44 px | `h-11 w-11` | Minimum touch target for mobile interactive icons (WCAG 2.1) |
| 48 px | `h-12 w-12` | Feature/stat card decorative icon container |

```tsx
{/* Feature card icon container — from components/Dashboard/StatCard.tsx */}
<div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#2D0A0A] text-[#DC2626]">
  {icon}
</div>
```

### Dynamic sizing example

When a component supports multiple densities, compute the class string from the `size` prop:

```tsx
// From components/TransactionStatusIndicator.tsx
const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

<Loader2 className={`${iconSize} animate-spin`} aria-hidden="true" />
```

---

## Adding a custom icon

Lucide covers almost every action and status need in this codebase. Before adding a custom icon, check [lucide.dev](https://lucide.dev) to confirm the icon you need does not already exist there.

If you genuinely need a non-Lucide icon (brand logo, illustration, platform-specific glyph):

### 1. Create the SVG component file

Place the file in `components/icons/`. Create the directory if it does not exist yet.

Naming convention: `PascalCase`, descriptive of the icon's meaning, suffixed with `Icon`.

```
components/icons/StellarLogoIcon.tsx
components/icons/FreighterWalletIcon.tsx
```

### 2. Write the component

Wrap the SVG in a React component that forwards `className`, `aria-hidden`, and other standard HTML attributes. Match the same API as Lucide icons so call sites are uniform.

```tsx
// components/icons/StellarLogoIcon.tsx
import { type SVGProps } from "react";

export default function StellarLogoIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* paste optimised SVG path(s) here */}
      <path d="..." />
    </svg>
  );
}
```

Key points:
- Use `fill="currentColor"` (or `stroke="currentColor"`) so the icon inherits text colour from Tailwind — no hardcoded hex values inside the SVG.
- Set a fixed `viewBox` (usually `0 0 24 24` to match Lucide's grid).
- Default to `aria-hidden="true"` inside the component; call sites add `aria-label` when the icon is interactive and has no visible label.
- Do **not** add a hardcoded `width`/`height` attribute — let Tailwind classes control size, just as with Lucide.

### 3. Optimise the SVG before committing

Paste the raw SVG through [SVGOMG](https://jakearchibald.github.io/svgomg/) (web) or run `npx svgo path/to/icon.svg` locally to strip editor metadata and reduce file size. Replace the path data in the component with the optimised output.

### 4. Use it like any other icon

```tsx
import StellarLogoIcon from "@/components/icons/StellarLogoIcon";

<StellarLogoIcon className="w-5 h-5 text-white" aria-hidden="true" />
```

### 5. No build step required

There is no SVG sprite generation script or code generation pipeline. The component is the icon. Import it directly.

---

## Design tokens

There are no dedicated `icon.*` CSS variables or Tailwind config extensions for icon size or stroke weight today. The iconography handoff document proposes future semantic tokens (`icon.nav`, `icon.control`, `icon.feature`, `stroke.default`) — see [docs/iconography-guidelines-handoff.md](iconography-guidelines-handoff.md) if you want to track that work.

For **colour**, icons inherit text colour from their surrounding context using `currentColor`. Apply one of the existing brand/semantic colour utilities to the icon or its container:

| Semantic meaning | Tailwind class |
|-----------------|---------------|
| Brand / active / error | `text-[#DC2626]` |
| Neutral / idle | `text-gray-300` or `text-gray-400` |
| Success | `text-emerald-300` |
| Warning | `text-amber-200` |
| Pending | `text-red-200` |
| White (on dark surfaces) | `text-white` |

Applying colour to the container element (via `text-{colour}`) lets the icon inherit it automatically without adding a class to the icon itself:

```tsx
<span className="text-[#DC2626]">
  <AlertCircle className="w-4 h-4" aria-hidden="true" />
</span>
```

---

## Accessibility quick-reference

| Situation | What to do |
|-----------|-----------|
| Icon next to visible text | `aria-hidden="true"` on the icon |
| Icon-only button or link | `aria-label="..."` on the interactive element |
| Animated spinner (pending state) | `aria-hidden="true"` on the icon; use an `aria-live` region or `role="status"` on the container to announce state changes |
| Icon conveys status change | Pair with visible text or `sr-only` span — never rely on icon shape or colour alone |
| Touch target | Minimum `h-11 w-11` (44 px) container for interactive icon-only controls |

Full accessibility guidance is in [docs/iconography-guidelines-handoff.md](iconography-guidelines-handoff.md).

---

## Meaning map

These icon names are established across the codebase. Use them consistently so icons carry the same meaning on every screen.

| Action / state | Lucide icon name |
|----------------|-----------------|
| Send money | `Send` |
| Dashboard | `LayoutDashboard` |
| Bills / documents | `FileText` |
| Insurance / protection | `Shield` / `ShieldCheck` |
| Family / shared access | `Users` |
| Settings | `Settings` |
| Export / download | `Download` |
| Filter | `Filter` |
| Search | `Search` |
| Add new | `Plus` |
| Back / previous | `ArrowLeft` |
| Success / completed | `CheckCircle2` |
| In progress | `Loader2` or `Clock3` |
| Warning | `AlertTriangle` |
| Error / failed | `AlertCircle` or `XCircle` |
| Copy to clipboard | `Copy` → `Check` (confirmation) |
| Trending up | `TrendingUp` |
| Trending down | `TrendingDown` |
| No change | `Minus` |
| Edit | `Pencil` |
| Visibility / preview | `Eye` |

---

## Related docs

- [docs/ICON_REFERENCE.md](ICON_REFERENCE.md) — single-page name / source / preferred-use lookup for every icon in the codebase
- [docs/iconography-guidelines-handoff.md](iconography-guidelines-handoff.md) — full design handoff: size-and-stroke grid, breakpoint guidance, container specs, open questions
- [docs/COMPONENTS.md](COMPONENTS.md) — per-component notes; `BackToTop` documents its icon accessibility pattern
- [docs/THEMING.md](THEMING.md) — colour tokens and brand palette
- [docs/tailwind-extensions.md](tailwind-extensions.md) — Tailwind config extensions
