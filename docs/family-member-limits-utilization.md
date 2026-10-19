# Family Member Limits & Utilization

> **Audience:** Contributors designing, implementing, or reviewing spending-limit controls and utilization visuals on the Family Wallets page.
> **Goal:** Document the threshold semantics, the limit-edit affordance (including its disabled pre-integration state), and the responsive layout so reviewers can verify behaviour against the documented intent.

## Overview

Each family member card on `/family` shows a spending limit, current spend, remaining balance, and a utilization meter. An admin can review these at a glance and quickly identify members approaching or exceeding their cap. The page sorts cards by highest utilization first so the most urgent reviews appear at the top.

## Utilization Thresholds

The utilization meter uses three visual states derived from the member's `usedPercentage` (0–100+):

| Threshold | Range | Bar colour | Badge | Helper text |
|-----------|-------|------------|-------|-------------|
| **Ok** | 0–74% | `status-success-fg` (#86EFAC) | "On track" | "No spending this cycle" (0%) or "Spending is within the monthly cap" |
| **Near limit** | 75–99% | `status-warning-fg` (#FDE68A) | "Near limit" | "Approaching the monthly cap - review recommended" |
| **Over limit** | 100%+ | `status-error-fg` (#FDA4AF) | "Over limit" | "Exceeded the monthly cap - action required" |

The threshold is determined by the `getThreshold()` function exported from `components/ui/UtilizationMeter.tsx`. The same logic is used inline by `FamilyMemberStatCard` and `FamilyMemberDetailDrawer`.

A compact threshold badge ("NEAR" / "OVER") appears next to the role badge in the card header for non-ok members, using the same status-token colours. This lets admins spot members needing attention without scanning down to the meter.

The card's outer border also reflects the threshold so members needing attention are identifiable from the card-edge colour:
- **Ok:** `border-white/10` (neutral, blends with the card's default border)
- **Near limit:** `border-status-warning-border`
- **Over limit:** `border-status-error-border`

### Why 75%?

The 75% threshold is a deliberate design choice that surfaces members who need attention *before* they hit the cap. This gives admins time to review and adjust limits proactively rather than reacting after the fact. The threshold is not configurable per wallet at this time.

## Utilization Meter Component

A standalone `<UtilizationMeter>` component is available at `components/ui/UtilizationMeter.tsx` for reuse outside the family member card (e.g. the detail drawer, future dashboards).

```tsx
import UtilizationMeter from "@/components/ui/UtilizationMeter";

<UtilizationMeter
  percentage={member.usedPercentage}
  label="Utilization"
  ariaLabel={`${member.name} spending utilization`}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `percentage` | `number` | (required) | Current utilization percentage. Values over 100 display as 100% bar width but show the actual number. |
| `ariaLabel` | `string` | `"Spending utilization"` | Accessible label for the `role="progressbar"` element. |
| `label` | `string` | `undefined` | Optional heading shown above the bar (e.g. "Utilization"). |
| `showStatus` | `boolean` | `true` | Show the threshold badge and helper text below the bar. |

### Accessibility

- The bar uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`.
- The threshold label and helper text are rendered as visible text (not `aria-live`), since the value changes on every keystroke during editing and live regions would be noisy.
- All text meets WCAG AA contrast against the dark card backgrounds:
  - `#86EFAC` on `#0d0d0d` = 13.2:1
  - `#FDE68A` on `#0d0d0d` = 15.8:1
  - `#FDA4AF` on `#0d0d0d` = 10.6:1

## Per-Member Limit Edit Controls

### Card layout (FamilyMemberStatCard)

The spending-limit stat panel includes an inline edit affordance:

```
┌─────────────────────────────┐
│ SPENDING LIMIT          [🔒]│
│                             │
│ $500                        │
└─────────────────────────────┘
```

- **Pre-integration (default):** The icon is `Lock` and the button is disabled (`disabled:cursor-not-allowed disabled:opacity-30 disabled:grayscale`). A `title` attribute provides a tooltip explaining why editing is unavailable.
- **Post-integration:** The icon switches to `Edit2` and the button becomes enabled, navigating to the detail drawer where inline limit editing is available.

The bottom action bar mirrors this state:

```
┌──────────────┐ ┌──────────────┐
│   View       │ │  🔒 Edit     │
│   Details    │ │  Limits      │
└──────────────┘ └──────────────┘
```

- **"View Details"** is always enabled and opens the detail drawer.
- **"Edit Limits"** is disabled in pre-integration state with the same `Lock` icon and disabled styling.

### Disabled state styling

```
disabled:cursor-not-allowed
disabled:bg-red-600/20        (button background muted)
disabled:text-white/40        (text dimmed)
disabled:hover:bg-red-600/20  (hover suppressed)
```

### Detail drawer (FamilyMemberDetailDrawer)

The drawer provides full inline limit editing via an `Edit2` icon button that toggles to an input field with Save/Cancel buttons. This is already implemented and does not change in this design pass.

## Responsive Layout

### Mobile (< 768px, single-column)

```
┌─────────────────────────────┐
│ [M] Maria Santos            │
│      Recipient              │
│      Used this month        │
│      $320                   │
│      64% used               │
├─────────────────────────────┤
│ STELLAR ADDRESS        [📋] │
│ GDEMO1XX...XXXXX            │
├─────────────────────────────┤
│ SPENDING LIMIT │ SPENT │ REM│
│ $500           │ $320  │$180│
├─────────────────────────────┤
│ Utilization    [On track]   │
│ ═══════════════░░░░░░░░░░░░ │
│ 0%     64%          100%    │
│ Spending is within the...   │
├─────────────────────────────┤
│ [View Details  ] [Edit Limits]│ ← stacked vertically
└─────────────────────────────┘
```

- The limit stats row stacks to single-column (`grid-cols-1`).
- Action buttons stack vertically (`flex-col`).
- All panels maintain `p-4` padding for comfortable touch targets.

### Desktop (1280px, two-column grid)

```
┌──────────────────────────┐ ┌──────────────────────────┐
│ Card 1 (highest usage)   │ │ Card 2                   │
└──────────────────────────┘ └──────────────────────────┘
┌──────────────────────────┐ ┌──────────────────────────┐
│ Card 3                   │ │ Card 4 (lowest usage)    │
└──────────────────────────┘ └──────────────────────────┘
```

- Member cards render in a 2-column grid (`md:grid-cols-2`).
- The limit stats row shows 3 columns (`sm:grid-cols-3`).
- Action buttons sit side-by-side (`sm:flex-row`).
- Cards are sorted by highest utilization first.

## Files Reference

| File | Role |
|------|------|
| `components/ui/UtilizationMeter.tsx` | Standalone reusable utilization meter with threshold logic |
| `app/family/components/FamilyMemberStatCard.tsx` | Individual member card with limit controls and meter |
| `app/family/components/FamilyMemberSection.tsx` | Section header, summary stats, filter tags, and card grid |
| `app/family/components/FamilyMemberDetailDrawer.tsx` | Slide-in drawer with inline limit editing |
| `app/family/components/FamilyWalletsStatsCards.tsx` | Top-level aggregate stats cards |
| `app/family/page.tsx` | Page shell with two-column layout |
| `lib/validation/family-limits.ts` | Spending limit validation (non-negative finite number) |
| `lib/hooks/useFamilyMemberDetail.ts` | Data hook for drawer (fetch + optimistic limit update) |
| `tailwind.config.js` | Status token definitions (success/warning/error) |

## Cross-references

- [docs/family-wallets-handoff.md](./family-wallets-handoff.md) -- Original component handoff notes
- [docs/SEMANTIC_TOKENS_AND_CONTRAST.md](./SEMANTIC_TOKENS_AND_CONTRAST.md) -- Status token colour and contrast requirements
- [docs/THEMING.md](./THEMING.md) -- Full catalogue of CSS custom properties and Tailwind tokens
- [docs/SPACING_TOKENS.md](./SPACING_TOKENS.md) -- Spacing scale reference
