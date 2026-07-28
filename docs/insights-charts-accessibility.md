# Insights charts — accessibility design notes

Covers `components/Insights/categoryDonutChart.tsx`, `remittanceTrendChart.tsx`,
`spendingVsSavingChart.tsx`, `TopCategoriesWidget.tsx`.

## Palette rationale

Single source of truth: `lib/config/chartPalette.json`, consumed by both
`tailwind.config.js` (`theme.colors.chart.1`–`8`) and
`components/Insights/palette.ts` (`INSIGHTS_PALETTE`).

| # | Hex | Name |
|---|---------|-----------------|
| 1 | #4E79A7 | blue-teal |
| 2 | #A0CBE8 | light blue |
| 3 | #F28E2B | orange |
| 4 | #FFBE7D | soft orange |
| 5 | #59A14F | green |
| 6 | #8CD17D | light green |
| 7 | #B6992D | brown-gold |
| 8 | #F1CE63 | yellow |

Colors are drawn from Tableau's extended 10-color categorical set, chosen
because it separates hues across the blue → orange → green → yellow range
rather than clustering in the red/green band that deuteranopia and
protanopia collapse together. No two *adjacent* palette entries (the order
charts assign colors in) share a hue family, which keeps the first several
categories distinguishable even before a chart needs entry 5 or beyond.

This is a mitigation, not a guarantee — entries 5/6 (green/light-green) and
7/8 (brown-gold/yellow) sit closer together for deuteranope viewers than the
blue/orange pairs do. That's why every chart in this set also carries a
text/value label and a legend (see below): color is a secondary cue, never
the only one a category's identity depends on.

## Legend placement per chart

- **categoryDonutChart**: interactive legend rows beside the donut, each
  showing swatch, category name, dollar amount, and percentage. Already
  present prior to this pass.
- **spendingVsSavingChart**: horizontal legend below the chart — swatch,
  series name, and now (added in this pass) the series' total dollar value.
- **remittanceTrendChart**: single-series chart; added a swatch + "Amount
  sent" label + total value row above the chart (previously had no legend
  or swatch at all tying the line color to its meaning).
- **TopCategoriesWidget**: each row already shows category name, amount,
  and percentage as text directly (color appears only on the progress bar
  fill, never as the sole identifier) — functionally equivalent to a
  legend without needing a separate swatch element.

## Per-chart screen-reader summary

All four components render a `.sr-only` paragraph (`aria-live="polite"`)
summarizing the data in prose, and the three Recharts-based components
additionally expose `role="img"` + `aria-label` on their chart container so
assistive tech gets a labelled image rather than an unlabeled SVG blob:

- **categoryDonutChart**: `"<title>: <category>: $<amount> (<pct>%), ..."`
  via `buildChartImageLabel`/`buildChartSummary` (`lib/a11y/chart.ts`).
- **remittanceTrendChart**: `generateTrendChartLabel`/`generateTrendChartSummary`
  — latest value per series plus running totals.
- **spendingVsSavingChart**: `generateBarChartLabel`/`generateBarChartSummary`
  — per-series totals for spending vs. savings.
- **TopCategoriesWidget**: inline-built summary string, one clause per
  category (`name: pct% amount $amount`).

## Hover/focus tooltip redlines

- Tooltip surface: `bg-black/80`, `border border-white/10`, `rounded-xl`,
  `shadow-2xl` — consistent across all three chart tooltips already.
- Tooltip text: white for values (high contrast), `text-gray-400` for
  labels (see contrast table below).
- Tooltips are attached via Recharts' `<Tooltip>` on hover; keyboard/focus
  parity relies on the always-visible legend rows (donut, spending/savings)
  and the sr-only summary (all four) rather than requiring hover to access
  the same information — nothing in any of the four charts is
  hover-only-accessible.

## Contrast verification

Checked with the existing `lib/a11y/wcag-contrast.ts` utility against
`brand.dark` (`#0A0A0A`), the darkest realistic card background these
charts render on. See `tests/unit/insights-charts-contrast.test.tsx` for
the automated version of this check — the table below is a snapshot for
reference:

- Text elements (axis labels, legend labels, tooltip labels) are held to
  WCAG AA normal-text contrast (≥ 4.5:1).
- Chart graphical elements (bars, lines, swatches) are held to WCAG
  non-text contrast (≥ 3:1, per SC 1.4.11), since they're UI components /
  graphical objects rather than body text.

## Audit finding fixed in this pass

`AXIS_COLOR` (`#6b7280`, Tailwind gray-500) — used for axis ticks and
tooltip/legend labels across all three Recharts-based components — failed
WCAG AA normal-text contrast against `#0A0A0A` (ratio just under 4.5:1).
Replaced with `#9CA3AF` (Tailwind gray-400) in all three files, which
passes. Confirmed by `tests/unit/insights-charts-contrast.test.tsx`.
