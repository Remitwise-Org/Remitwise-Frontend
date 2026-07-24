# Theming Token Map

Audience: contributors changing UI styles, components, or page layouts.

This project uses two theming layers:

- CSS custom properties in `app/globals.css` for global browser-level values.
- Tailwind theme extensions in `tailwind.config.js` for component styling.

Prefer these tokens before adding raw colors, spacing, focus rings, breakpoints,
or animation values. If a new value is needed, add it to the token layer first
and document its semantic role here in the same PR.

## CSS Custom Properties

All current CSS custom properties are declared in `app/globals.css`.

| Property | Default value | Dark-mode value | Semantic role | Current usage |
| --- | --- | --- | --- | --- |
| `--foreground-rgb` | `0, 0, 0` | `255, 255, 255` | Global foreground text color expressed as RGB channels for `rgb(var(...))` composition. | `body { color: rgb(var(--foreground-rgb)); }` |
| `--background-start-rgb` | `214, 219, 220` | `0, 0, 0` | Legacy page-gradient start channel. Keep documented because it is part of the global theme contract, even though the current body background is plain black. | Not currently referenced outside declaration. |
| `--background-end-rgb` | `255, 255, 255` | `0, 0, 0` | Legacy page-gradient end channel. Keep documented with `--background-start-rgb` for future gradient restoration. | Not currently referenced outside declaration. |
| `--background` | Not declared | `#010101` | Dark application canvas. Use for full-page dark surfaces when a CSS variable is required instead of a Tailwind class. | Declared for dark mode; not currently referenced outside declaration. |
| `--color-bg2` | Not declared | `#0f0f0f` | Upper layer of the dark card gradient. | Used by `--card`. |
| `--color-bg3` | Not declared | `#0a0a0a` | Lower layer of the dark card gradient. | Used by `--card`. |
| `--card` | Not declared | `linear-gradient(var(--color-bg2), var(--color-bg3))` | Reusable dark card background gradient. | Declared for card-like surfaces that need a CSS variable. |
| `--accent` | Not declared | `#dc2626` | Primary red accent for dark-mode UI emphasis. Prefer Tailwind `brand.red` or `red.600` in JSX unless CSS needs a variable. | Declared for CSS-level accent styling. |

The active global body styles are intentionally minimal:

```css
body {
  color: rgb(var(--foreground-rgb));
  background: black;
}
```

## Tailwind Theme Tokens

Tailwind tokens are defined under `theme.extend` in `tailwind.config.js`.
Use them through class names so reviewers can distinguish semantic values from
one-off styling.

### Breakpoints

| Token | Value | Semantic role | Example |
| --- | --- | --- | --- |
| `320` | `320px` | Smallest supported mobile viewport, including iPhone SE. | `320:px-6` |
| `375` | `375px` | Primary mobile target for modern phones. | `375:text-base` |
| `450` | `450px` | Foldables and larger phones before tablet layout. | `450:grid-cols-2` |
| `tablet` | `768px` | Tablet portrait layouts. | `tablet:grid-cols-3` |
| `laptop` | `1024px` | Tablet landscape and small laptop layouts. | `laptop:px-8` |
| `desktop` | `1440px` | Full desktop layout width. | `desktop:text-5xl` |

### Spacing

| Token | Value | Semantic role | Example |
| --- | --- | --- | --- |
| `space-xs` | `4px` | Small internal gaps, icon/text spacing. | `gap-space-xs` |
| `space-sm` | `8px` | Compact stacked controls or labels. | `space-y-space-sm` |
| `space-md` | `16px` | Default component padding or list spacing. | `p-space-md` |
| `space-lg` | `24px` | Section-level spacing inside cards or panels. | `gap-space-lg` |
| `space-xl` | `32px` | Large section spacing. | `py-space-xl` |
| `3.5` | `14px` | Fine-grained padding and control spacing. | `py-3.5` |
| `7` | `28px` | Mobile layout spacing between default `6` and `8`. | `375:gap-7` |
| `9` | `36px` | Large but not full `10` spacing. | `tablet:gap-9` |
| `11` | `44px` | Minimum accessible touch target dimension. | `h-11 w-11` |
| `13` | `52px` | Large icon-button or panel spacing. | `h-13` |
| `15` | `60px` | Large vertical rhythm. | `py-15` |
| `17.5` | `70px` | Fine-grained hero/section spacing. | `pt-17.5` |
| `22.5` | `90px` | Wide section spacing. | `py-22.5` |
| `27.5` | `110px` | Largest custom section spacing. | `py-27.5` |

### Focus Rings

| Token | Value | Semantic role | Example |
| --- | --- | --- | --- |
| `ring-focus` | `3px` | Accessible focus ring width for important controls. | `focus-visible:ring-focus` |
| `ring-offset-focus` | `4px` | Focus ring separation from dark surfaces. | `focus-visible:ring-offset-focus` |

### Colors

| Token | Value | Semantic role | Example |
| --- | --- | --- | --- |
| `brand.red` | `#D72323` | Primary RemitWise action and brand accent. | `bg-brand-red` |
| `brand.dark` | `#0A0A0A` | Brand dark canvas. | `bg-brand-dark` |
| `brand.redHover` | `#B91C1C` | Hover state for primary red actions. | `hover:bg-brand-redHover` |
| `primary.50` | `#f0f9ff` | Lightest informational blue. | `bg-primary-50` |
| `primary.100` | `#e0f2fe` | Very light informational blue. | `bg-primary-100` |
| `primary.200` | `#bae6fd` | Light informational blue. | `bg-primary-200` |
| `primary.300` | `#7dd3fc` | Soft informational blue. | `text-primary-300` |
| `primary.400` | `#38bdf8` | Medium informational blue. | `text-primary-400` |
| `primary.500` | `#0ea5e9` | Default informational blue. | `text-primary-500` |
| `primary.600` | `#0284c7` | Strong informational blue. | `bg-primary-600` |
| `primary.700` | `#0369a1` | Dark informational blue. | `bg-primary-700` |
| `primary.800` | `#075985` | Darker informational blue. | `bg-primary-800` |
| `primary.900` | `#0c4a6e` | Darkest informational blue. | `bg-primary-900` |
| `red.600` | `#DC2626` | Default Tailwind-compatible red action color. | `bg-red-600` |
| `red.700` | `#B91C1C` | Red hover/pressed state. | `hover:bg-red-700` |
| `red.800` | `#991B1B` | Strong red surface or pressed state. | `bg-red-800` |
| `red.900` | `#7F1D1D` | Deep red surface. | `bg-red-900` |

### Status Colors

Status tokens are grouped by foreground, background, border, and soft surface.
Use these instead of hand-rolled status colors so success, warning, error, and
info states remain consistent.

| Token | Value | Semantic role | Example |
| --- | --- | --- | --- |
| `status.success.fg` | `#86EFAC` | Success text or progress fill. | `text-status-success-fg` |
| `status.success.bg` | `rgba(34, 197, 94, 0.14)` | Success badge or panel background. | `bg-status-success-bg` |
| `status.success.border` | `rgba(34, 197, 94, 0.28)` | Success border. | `border-status-success-border` |
| `status.success.soft` | `rgba(20, 83, 45, 0.28)` | Deeper success surface. | `bg-status-success-soft` |
| `status.warning.fg` | `#FDE68A` | Warning text or icon. | `text-status-warning-fg` |
| `status.warning.bg` | `rgba(245, 158, 11, 0.14)` | Warning badge or panel background. | `bg-status-warning-bg` |
| `status.warning.border` | `rgba(245, 158, 11, 0.28)` | Warning border. | `border-status-warning-border` |
| `status.warning.soft` | `rgba(120, 53, 15, 0.28)` | Deeper warning surface. | `bg-status-warning-soft` |
| `status.error.fg` | `#FDA4AF` | Error text or icon. | `text-status-error-fg` |
| `status.error.bg` | `rgba(244, 63, 94, 0.14)` | Error badge or panel background. | `bg-status-error-bg` |
| `status.error.border` | `rgba(244, 63, 94, 0.28)` | Error border. | `border-status-error-border` |
| `status.error.soft` | `rgba(127, 29, 29, 0.3)` | Deeper error surface. | `bg-status-error-soft` |
| `status.info.fg` | `#93C5FD` | Informational text or icon. | `text-status-info-fg` |
| `status.info.bg` | `rgba(59, 130, 246, 0.14)` | Informational badge or panel background. | `bg-status-info-bg` |
| `status.info.border` | `rgba(59, 130, 246, 0.28)` | Informational border. | `border-status-info-border` |
| `status.info.soft` | `rgba(30, 64, 175, 0.24)` | Deeper informational surface. | `bg-status-info-soft` |

### Animation Tokens

| Token | Value | Semantic role | Example |
| --- | --- | --- | --- |
| `animate-neon-pulse` | `neon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite` | Pulsing emphasis for neon/accent elements. | `animate-neon-pulse` |
| `animate-shimmer` | `shimmer 2s linear infinite` | Skeleton or loading shimmer. | `animate-shimmer` |
| `animate-slide-in-right` | `slide-in-right 0.25s ease-out forwards` | Drawer or toast entrance from the right. | `animate-slide-in-right` |
| `animate-slide-in-bottom` | `slide-in-bottom 0.25s ease-out forwards` | Mobile sheet entrance from the bottom. | `animate-slide-in-bottom` |

## Global Utility Classes

These utilities are defined in `app/globals.css`.

| Utility | CSS output | Semantic role |
| --- | --- | --- |
| `.starry-bg` | Repeating radial dot background at `40px` size. | Decorative dark-page background. |
| `.safari-safe-top` | `padding-top: env(safe-area-inset-top)` | Respect iOS top safe area. |
| `.safari-safe-bottom` | `padding-bottom: env(safe-area-inset-bottom)` | Respect iOS bottom safe area. |
| `.safari-safe-left` | `padding-left: env(safe-area-inset-left)` | Respect iOS left safe area. |
| `.safari-safe-right` | `padding-right: env(safe-area-inset-right)` | Respect iOS right safe area. |
| `.touch-target` | `min-height: 44px; min-width: 44px` | Minimum accessible square touch target. |
| `.touch-target-wide` | `min-height: 44px; min-width: 88px` | Minimum accessible wide touch target for buttons. |

## Contributor Checklist

- Use CSS custom properties only for global CSS values that must exist outside
  Tailwind class composition.
- Use Tailwind token classes for component styling in JSX.
- Keep status UI on `status.*` tokens.
- Keep primary actions on `brand.red`, `brand.redHover`, or the local red scale.
- Do not introduce new hard-coded colors, spacing, radii, or focus values in a
  component when a token already represents the same role.
- Update this file when `app/globals.css` or `tailwind.config.js` adds, removes,
  or changes theme tokens.
