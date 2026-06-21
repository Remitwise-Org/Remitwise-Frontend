# Family Member Limits and Utilization Handoff

Feature area:
- Family Wallets per-member spending limit controls and utilization visuals

Route mapping:
- `/family` -> `app/family/page.tsx`
- Member card component -> `app/family/components/FamilyMemberStatCard.tsx`
- Member section -> `app/family/components/FamilyMemberSection.tsx`
- Summary cards -> `app/family/components/FamilyWalletsStatsCards.tsx`
- Status tokens -> `tailwind.config.js` (`status.success.*`, `status.warning.*`, `status.error.*`)

Primary user task:
- Quickly scan member cards by utilization to identify who needs a limit review.
- See at a glance whether a member is on track, near their cap, or over their limit.
- Understand the limit-edit affordance even though contract integration is pending.

---

## Utilization Meter

Each member card includes a utilization section with a labeled progress meter, status badge, and helper text.

### Thresholds

| Threshold | Range | Status Token | Badge Label | Bar Fill | Helper Text |
|-----------|-------|-------------|-------------|----------|-------------|
| On track | 0–74% | `status.success.*` | "On track" | `bg-status-success-fg` | "Usage is within range." / "No spending recorded yet." |
| Near limit | 75–99% | `status.warning.*` | "Near limit" | `bg-status-warning-fg` | "Approaching spending cap." |
| Over limit | ≥ 100% | `status.error.*` | "Over limit" | `bg-status-error-fg` | "Exceeded monthly limit." |

### Visual design

- Progress bar fills left-to-right with a solid status-token color (`bg-status-{tone}-fg`).
- The meter container shows the current percentage centered between 0% and 100% labels.
- When usage ≥ 75%, the utilization panel border changes to `border-status-warning-border` or `border-status-error-border` for quick visual scanning.
- The "Remaining" stat card below the meter turns `text-status-error-fg` when remaining is negative (over limit).

---

## Limit-Edit Affordance

The "Edit Limits" button is rendered as a full-width disabled button with:
- `Edit2` icon (pencil) from lucide-react
- Disabled cursor (`cursor-not-allowed`) and reduced opacity (`opacity-60`)
- Red-tinted background (`bg-red-500/10`, `border-red-500/20`) to visually separate from the "View Details" neutral button
- Helper text beneath: "Member actions will unlock after the wallet contract integration is connected."

This affordance communicates the intended interaction (adjust per-member spending limits) while making the pre-integration state explicit. When contract integration ships, the `disabled` attribute is removed and the button wires to the limit-adjustment flow.

---

## Member Card Layout

### Card structure (top to bottom)

1. **Identity row** — Avatar initial, name, role badge, usage-status badge
2. **Monthly usage** — Amount used this month, percentage of limit
3. **Stellar address** — ID with copy button
4. **Limit stats row** — 3-column grid: Spending limit, Spent, Remaining (red when negative)
5. **Utilization meter** — Status-colored progress bar with panel border feedback
6. **Action buttons** — "View Details" (neutral) and "Edit Limits" (accent, disabled)

### Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single-column card stack. Limit stats and action buttons stack vertically. Utilization meter spans full width. |
| Tablet (640px–1023px) | Two-column card grid (`md:grid-cols-2`). Identity row shifts to horizontal flex. Limit stats row shows 3 columns. |
| Desktop (≥ 1024px) | Two-column card grid. Right rail with roles and add-member panel pinned via `xl:sticky`. |

---

## Accessibility

- Utilization state is conveyed by text label + percentage value + progress meter (not by color alone).
- Status badges use `status.*` token colors which pass AA contrast on dark backgrounds:
  - Success green (`#86EFAC`) on dark bg
  - Warning yellow (`#FDE68A`) on dark bg
  - Error pink/red (`#FDA4AF`) on dark bg
- Focus-visible rings use `ring-red-400` with `ring-offset-2` offset against `#0d0d0d` for keyboard navigation.
- Button touch targets are 44px+ (WCAG 2.1 AAA).

---

## Tailwind Tokens Used

- `text-status-success-fg`, `bg-status-success-fg`, `border-status-success-border`, `bg-status-success-bg`
- `text-status-warning-fg`, `bg-status-warning-fg`, `border-status-warning-border`, `bg-status-warning-bg`
- `text-status-error-fg`, `bg-status-error-fg`, `border-status-error-border`, `bg-status-error-bg`

All tokens already exist in `tailwind.config.js`. No new tokens were added.

---

## Open Questions

- Should the 75% warning threshold be configurable per wallet in a later pass?
- Should admins with no personal spending limit be excluded from utilization reporting?
- Should over-limit members be surfaced with inline alert copy in addition to the red meter?

---

## Closure Note

- design: handoff ready in repo docs; utilization meter and limit affordance implemented in code
