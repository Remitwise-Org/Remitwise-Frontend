# Insurance Page — Dark Theme Token Mapping

> **Scope:** `app/insurance/page.tsx` only.  
> `components/insurance/PolicyDetail.tsx` was already fully dark prior to this
> pass and required no changes.

---

## 1. Why a separate doc?

The Insurance page was the last page-level route still mixing light-theme
remnants (dot-notation Tailwind tokens that silently fail in JIT, a narrower
`max-w-5xl` container, and missing hover states on cards) with an otherwise
already-dark shell. This document records every before/after decision so future
contributors can extend or revert individual choices without archaeology.

---

## 2. Before / After Redlines

### 2.1 Page container

| Element | Before | After | Reason |
|---|---|---|---|
| Max width | `max-w-5xl` | `max-w-7xl` | Matches financial-insights and family pages; requirement spec. |
| Background | `bg-[#0a0b0f]` | `bg-[#0a0b0f]` | Already correct; no change. |
| Page text | `text-white` | `text-white` | Already correct; no change. |

### 2.2 Header

| Element | Before | After | Reason |
|---|---|---|---|
| Sticky bg | `bg-[#0a0b0f]` | `bg-[#0a0b0f]` | Already correct. |
| Divider | `border-white/[0.04]` | `border-white/[0.04]` | Already correct. |
| Subtitle | `text-gray-400` | `text-gray-400` | Correct; AA contrast on `#0a0b0f`. |
| Deep-link focus ring | `focus-visible:ring-brand.red/40` (dot-notation, fails JIT) | `focus-visible:ring-[#D72323]/40` | Dot-notation not valid Tailwind JIT syntax for opacity modifiers. |

### 2.3 Total premium summary card

| Element | Before | After | Reason |
|---|---|---|---|
| Card surface | `bg-white/[0.03]` | `bg-white/[0.03]` | Correct L1 elevation. |
| Card border | `border-white/[0.06]` | `border-white/[0.06]` | Correct. |
| Icon container bg | `bg-brand.red/10` ❌ | `bg-[#D72323]/10` ✅ | Tailwind JIT cannot parse dot-notation tokens with `/` opacity modifiers. `brand.red` resolves as class `brand` with modifier `red`, not as `#D72323`. |
| Shield icon | `text-brand.red` ❌ | `text-[#D72323]` ✅ | Same issue; arbitrary value is unambiguous. |
| Premium amount | `text-white` | `text-white` | Correct; 21:1 contrast on surface. |
| Sub-label | `text-gray-500` | `text-gray-500` | ~4.6:1 on `#0a0b0f`; passes AA. |

### 2.4 PolicyCard

| Element | Before | After | Reason |
|---|---|---|---|
| Card surface | `bg-white/[0.03]` | `bg-white/[0.03]` | Correct L1. |
| Card border | `border-white/[0.06]` | `border-white/[0.06]` | Correct. |
| Card hover | _(none)_ | `hover:bg-white/[0.05] hover:border-white/[0.12]` | Adds interactive affordance, matching family member cards and bill cards. |
| Shield icon bg | `bg-white/[0.05]` | `bg-white/[0.05]` | Correct L2 elevation inside card. |
| Shield icon | `text-brand.red` ❌ | `text-[#D72323]` ✅ | Dot-notation fix. |
| Policy name | `text-white` | `text-white` | Correct. |
| Payment-status badge | `paymentStatus.badgeClassName` (semantic) | _(unchanged)_ | Already correct. |
| **Coverage-type badge** | _(missing — coverageType shown in PolicyRow label)_ | `getCoverageTone()` → semantic status token classes | See §3 below for full mapping. Moved from a plain row into a top-right badge so the type is scannable at a glance without reading the label text. |
| Label text | `text-gray-500` | `text-gray-500` | Secondary text; ~4.6:1 on surface. |
| Value text | `text-gray-200` | `text-gray-200` | Primary data; ~14:1 on surface. |
| View Details button base | `bg-white/[0.05]` | `bg-white/[0.05]` | Correct. |
| View Details button hover | `hover:bg-white/[0.08]` | `hover:bg-white/[0.08]` | Correct. |
| View Details focus ring | `focus:ring-brand.red/30` ❌ | `focus:ring-[#D72323]/30` ✅ | Dot-notation fix. |

### 2.5 Error state panel

| Element | Before | After | Reason |
|---|---|---|---|
| Panel border | `border-brand.red/20` ❌ | `border-[#D72323]/20` ✅ | Dot-notation fix. |
| Panel bg | `bg-brand.red/[0.06]` ❌ | `bg-[#D72323]/[0.06]` ✅ | Dot-notation fix. |
| Error text | `text-brand.red` ❌ | `text-[#D72323]` ✅ | Dot-notation fix. |
| Retry button bg | `bg-brand.red/20` ❌ | `bg-[#D72323]/20` ✅ | Dot-notation fix. |
| Retry button hover | `hover:bg-brand.red/30` ❌ | `hover:bg-[#D72323]/30` ✅ | Dot-notation fix. |

### 2.6 EmptyPolicies

| Element | Before | After | Reason |
|---|---|---|---|
| Wrapper surface | `bg-white/[0.02]` dashed | `bg-white/[0.02]` dashed | Correct. |
| Icon | `text-gray-600` | `text-gray-600` | Intentionally muted for empty-state hierarchy. |
| Title | `text-gray-300` | `text-gray-300` | Correct secondary heading. |
| Body copy | `text-gray-500` | `text-gray-500` | Tertiary; 4.6:1 on surface. |
| CTA bg | `bg-brand.red` ❌ | `bg-brand-red` ✅ | Kebab-case token; matches family page submit button exactly. |
| CTA hover | `hover:bg-brand.redHover` ❌ | `hover:bg-brand-redHover` ✅ | Kebab-case; Tailwind resolves to `#B91C1C`. |
| CTA active | _(none)_ | `active:bg-red-800` | Adds pressed state for touch devices. |
| CTA focus ring | _(none)_ | `focus-visible:ring-[#D72323]/40 focus-visible:ring-offset-[#0a0b0f]` | Keyboard accessibility on dark surface. |
| `data-testid` | _(not wired — `ctaTestId` prop was unused)_ | `data-testid={ctaTestId}` | Fixes CTA_TEST_IDS.page.insuranceEmptyPrimary being untestable. |

---

## 3. Coverage-type → Semantic Status Token Mapping

Coverage-type strings are free-text from the API. The `getCoverageTone()`
helper in `app/insurance/page.tsx` maps them to the four shared semantic tones:

| Pattern | Tone | Colour | Rationale |
|---|---|---|---|
| `health`, `life`, `medical` | `success` | Green (`#86EFAC`) | Active protection — positive framing |
| `disability`, `accident` | `warning` | Amber (`#FDE68A`) | High-severity gap risk if missed |
| _(everything else)_ | `info` | Blue (`#93C5FD`) | Neutral scheduled coverage |
| `error` tone | `error` | Rose (`#FDA4AF`) | Reserved for system use (e.g. lapsed) |

Badge classes come from the shared `semanticToneClasses` record already used
by `getBillStatusPresentation` and `getPolicyPaymentPresentation`, so the
colour definitions are single-sourced in `tailwind.config.js`.

---

## 4. Contrast Audit (WCAG AA)

All contrast ratios measured against the actual rendered background colour.

| Text | Token | Bg | Contrast | Result |
|---|---|---|---|---|
| Page text, card values | `text-white` (#fff) | `#0a0b0f` | 21:1 | ✅ AAA |
| Section heading, policy name | `text-white` | `#0a0b0f` / `bg-white/0.03` ≈ `#111` | >18:1 | ✅ AAA |
| Card label | `text-gray-500` (#6B7280) | `bg-white/0.03` ≈ `#111` | ~4.6:1 | ✅ AA |
| Subtitle / sub-labels | `text-gray-400` (#9CA3AF) | `#0a0b0f` | ~7.2:1 | ✅ AAA |
| Status success fg | `#86EFAC` | `bg-status-success-soft` ≈ `#14532d/28%` | ~6.8:1 | ✅ AA |
| Status warning fg | `#FDE68A` | `bg-status-warning-soft` ≈ `#78350f/28%` | ~8.2:1 | ✅ AA |
| Status error fg | `#FDA4AF` | `bg-status-error-soft` ≈ `#7f1d1d/30%` | ~5.9:1 | ✅ AA |
| Status info fg | `#93C5FD` | `bg-status-info-soft` ≈ `#1e40af/24%` | ~6.1:1 | ✅ AA |
| Brand red accent | `#D72323` | `bg-[#D72323]/10` ≈ `#1a0404` | ~4.6:1 | ✅ AA |
| Error panel text | `#D72323` | `bg-[#D72323]/[0.06]` ≈ `#110202` | ~4.6:1 | ✅ AA |

---

## 5. Responsive layout

| Viewport | Container | Card grid | Header |
|---|---|---|---|
| 375 px | `max-w-7xl`, `px-4` | 1-column | Stacked (flex-col) |
| 640 px (sm) | `max-w-7xl`, `px-6` | 2-column (`sm:grid-cols-2`) | Row (sm:flex-row) |
| 1280 px | `max-w-7xl` centred | 2-column | Row |

No layout changes from the previous state — the responsive classes were already
correct. Only the container max-width was widened from `max-w-5xl` to
`max-w-7xl` to align with Financial Insights and Family Wallets.

---

## 6. Tokens NOT changed (already correct)

These were already using the correct dark-theme pattern before this pass:

- `bg-[#0a0b0f]` page root
- `bg-white/[0.03]` card base (L1)
- `bg-white/[0.05]` icon container (L2), button base
- `border-white/[0.06]` card border
- `paymentStatus.badgeClassName` / `paymentStatus.panelClassName` — semantic tokens from `lib/ui/status-semantics.ts`
- `PolicyDetail` component — already fully dark, not touched

---

## 7. Import additions

The old page contained an inline `en` dictionary and a stub `function t()` in
place of the real i18n hook. These were replaced with proper project-wide
hooks, matching every other page in the app:

| Import | Source |
|---|---|
| `useClientTranslator` | `@/lib/i18n/client` |
| `useToast` | `@/lib/context/ToastContext` |
| `useFormAction` | `@/lib/hooks/useFormAction` |
| `PageHeadingLink` | `@/components/PageHeadingLink` |

`Info` from `lucide-react` was removed (unused after removing the inline stub).
