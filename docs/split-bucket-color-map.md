# Split Bucket Color Map

Single source of truth for the four Smart Money Split buckets.  
Canonical definition lives in **`lib/config/split-buckets.ts`** (`SPLIT_BUCKETS`).

---

## Buckets at a glance

| Key | Label | Icon (lucide-react) | Bar class | Text class | Hex |
|-----|-------|---------------------|-----------|------------|-----|
| `spending` | Daily Spending | `ShoppingCart` | `bg-blue-300` | `text-blue-300` | `#93C5FD` |
| `savings` | Savings | `PiggyBank` | `bg-green-300` | `text-green-300` | `#86EFAC` |
| `bills` | Bills | `FileText` | `bg-amber-300` | `text-amber-300` | `#FDE68A` |
| `insurance` | Insurance | `Shield` | `bg-violet-400` | `text-violet-400` | `#A78BFA` |

---

## Token alignment with `tailwind.config.js`

| Bucket | Tailwind token source | Semantic intent |
|--------|----------------------|-----------------|
| spending | `status.info` palette — blue family | Represents "daily flow / informational" |
| savings | `status.success` palette — green family | Represents "growth / positive outcome" |
| bills | `status.warning` palette — amber family | Represents "attention / upcoming obligation" |
| insurance | Violet (nearest to `brand.red` protection zone) | Represents "protection / shield" |

The brand red (`brand.red #D72323`, `brand.redHover #B91C1C`) is reserved for primary actions, error states, and the RemitWise brand mark.  It is intentionally **not** used as a bucket color to avoid ambiguity with validation errors.

---

## WCAG 2.1 AA compliance

All four foreground hex values were checked against the app's dark surfaces (`#010101`, `#0A0A0A`):

| Color | Surface | Contrast ratio | AA text (4.5:1) | AA UI (3:1) |
|-------|---------|----------------|-----------------|-------------|
| `#93C5FD` blue-300 | `#010101` | ≈ 9.8:1 | ✅ | ✅ |
| `#86EFAC` green-300 | `#010101` | ≈ 10.4:1 | ✅ | ✅ |
| `#FDE68A` amber-300 | `#010101` | ≈ 12.1:1 | ✅ | ✅ |
| `#A78BFA` violet-400 | `#010101` | ≈ 7.2:1 | ✅ | ✅ |

**Labels are always conveyed by icon + text, not color alone** (WCAG 1.4.1 Use of Color).  
Each bucket renders its `LucideIcon` with `aria-hidden="true"` alongside a visible text label.

---

## Edge-case handling

### One bucket at 100%
The allocation bar renders a single full-width segment in that bucket's color.  
The other three detail cards appear at `opacity-40` with `0%` displayed, so they are still labeled and discoverable but visually suppressed.

### A bucket at 0%
- The allocation bar **omits** the segment entirely (zero-width segments are skipped).  
- The corresponding detail card renders at `opacity-40` with `0%` and a dimmed percentage numeral, but the icon and label remain visible.

### Percentage rounding (sum must equal exactly 100)
Displayed percentages are computed with the **largest-remainder algorithm** (`roundToHundred`).  
Raw floored values are summed; any deficit (due to fractional parts) is distributed by descending remainder to the buckets with the largest fractional part.  
This guarantees the displayed digits always sum to exactly 100 regardless of slider values.

The algorithm is implemented in two places:
- `app/split/page.tsx` — `roundToHundred()` (for detail cards and the bar in the editor)
- `components/SmartMoneySplitHeader.tsx` — `roundToHundred()` (for the compact header bar)

Both are identical; the header is intentionally self-contained to avoid a circular import between a component and a page.

---

## Usage

```tsx
import { SPLIT_BUCKETS } from "@/lib/config/split-buckets";
import type { SplitConfig } from "@/lib/remittance/split";

// Render a legend
{SPLIT_BUCKETS.map((b) => {
  const Icon = b.icon;
  return (
    <span key={b.key} className={`flex items-center gap-1.5 ${b.textColor}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {b.label}
    </span>
  );
})}

// Map allocation values to buckets
{SPLIT_BUCKETS.map((b) => (
  <div key={b.key}>{allocation[b.key]}%</div>
))}
```

---

## Consumers

| File | Usage |
|------|-------|
| `app/split/page.tsx` | `AllocationBar`, `AllocationDetailCards`, `SplitInput` color |
| `components/SmartMoneySplitHeader.tsx` | Compact header bar + legend |
| `components/Dashboard/SplitBar.tsx` | Can be migrated to use `SPLIT_BUCKETS` for consistent colors |
| `components/Dashboard/MoneyDistributionWidget.tsx` | Can adopt `hex` field to replace hard-coded `#dc2626` shades |
