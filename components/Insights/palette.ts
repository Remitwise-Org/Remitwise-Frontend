// Shared categorical color palette for Insights charts.
//
// Single source of truth lives in lib/config/chartPalette.json, which is
// also read by tailwind.config.js (theme.colors.chart.1-8) — edit the
// colors there, not here. See docs/insights-charts-accessibility.md for the
// full color-blind-safety rationale.
import chartPalette from '@/lib/config/chartPalette.json'

export const INSIGHTS_PALETTE: string[] = chartPalette.colors
