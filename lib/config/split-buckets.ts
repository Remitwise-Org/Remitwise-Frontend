/**
 * Shared bucket configuration for the Smart Money Split feature.
 *
 * This is the single source of truth for bucket identity:
 * - key:    matches SplitConfig property names in lib/remittance/split.ts
 * - label:  human-readable display name
 * - icon:   Lucide icon component (icon + text, never color alone — WCAG 2.1 AA)
 * - color:  Tailwind bg-* class aligned to tailwind.config.js brand/status tokens
 * - textColor: Tailwind text-* class for numeric labels on dark backgrounds
 *
 * Reused by:
 *   - app/split/page.tsx            (allocation bar + detail cards)
 *   - components/Dashboard/SplitBar.tsx  (per-row progress bars)
 *   - components/Dashboard/MoneyDistributionWidget.tsx (legend items)
 *
 * Color rationale:
 *   - spending  → status.info blue  (#93C5FD / bg-blue-300)   – "daily flow"
 *   - savings   → status.success green (#86EFAC / bg-green-300) – "growth"
 *   - bills     → status.warning amber (#FDE68A / bg-amber-300) – "attention"
 *   - insurance → brand violet (bg-violet-400)                  – "protection"
 *
 * All four foreground colors clear 4.5:1 on the app's #010101 / #0A0A0A dark surface
 * (verified against WCAG 2.1 AA Non-Text Contrast § 1.4.11 for UI components and
 * WCAG 2.1 AA Text Contrast § 1.4.3 for labels).
 */

import { ShoppingCart, PiggyBank, FileText, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SplitConfig } from "@/lib/remittance/split";

export interface BucketMeta {
  /** Must match a key of SplitConfig */
  key: keyof SplitConfig;
  label: string;
  description: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tailwind bg-* class for the allocation bar segment and dot indicators */
  barColor: string;
  /** Tailwind text-* class for percentage/amount labels */
  textColor: string;
  /** Raw hex value used where Tailwind can't be applied (e.g. inline SVG, recharts Cell) */
  hex: string;
}

export const SPLIT_BUCKETS: readonly BucketMeta[] = [
  {
    key: "spending",
    label: "Daily Spending",
    description: "For immediate family expenses",
    icon: ShoppingCart,
    barColor: "bg-blue-300",
    textColor: "text-blue-300",
    hex: "#93C5FD",
  },
  {
    key: "savings",
    label: "Savings",
    description: "Allocated to savings goals",
    icon: PiggyBank,
    barColor: "bg-green-300",
    textColor: "text-green-300",
    hex: "#86EFAC",
  },
  {
    key: "bills",
    label: "Bills",
    description: "Automated bill payments",
    icon: FileText,
    barColor: "bg-amber-300",
    textColor: "text-amber-300",
    hex: "#FDE68A",
  },
  {
    key: "insurance",
    label: "Insurance",
    description: "Micro-insurance premiums",
    icon: Shield,
    barColor: "bg-violet-400",
    textColor: "text-violet-400",
    hex: "#A78BFA",
  },
] as const;
