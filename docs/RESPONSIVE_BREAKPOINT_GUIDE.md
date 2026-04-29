# Responsive Breakpoint Quick Reference Guide

## Custom Breakpoints

```
320px ──────► 375px ──────► 450px ──────► 768px ──────► 1024px ──────► 1440px
iPhone SE     iPhone 14     Foldable      iPad          iPad           Desktop
                                          Portrait      Landscape
```

## Usage Patterns

### Progressive Padding
```tsx
// Tight → Comfortable → Spacious
className="px-5 320:px-6 375:px-7 sm:px-8"
//         20px  24px    28px    32px
```

### Text Scaling
```tsx
// Small → Medium → Large
className="text-sm 375:text-base tablet:text-lg"
//         14px     16px         18px
```

### Grid Columns
```tsx
// Stack → 2-col → 3-col
className="grid-cols-1 450:grid-cols-2 xl:grid-cols-3"
```

## Touch Targets

```tsx
// Minimum 44×44px (WCAG 2.1 AAA)
className="touch-target"        // 44×44px
className="touch-target-wide"   // 44×88px
```

## Spacing Scale

```
3.5  = 14px   (tight mobile)
7    = 28px   (comfortable mobile)
9    = 36px   (spacious mobile)
11   = 44px   (touch target minimum) ⭐
13   = 52px   (tablet)
15   = 60px   (desktop)
17.5 = 70px   (large desktop)
22.5 = 90px   (extra large)
27.5 = 110px  (maximum)
```

## iOS Safe Areas

```tsx
// Respect notch/Dynamic Island
className="safari-safe-top"     // Top inset
className="safari-safe-bottom"  // Bottom inset
className="safari-safe-left"    // Left inset
className="safari-safe-right"   // Right inset
```

## Common Patterns

### Container
```tsx
<main className="max-w-7xl mx-auto px-5 320:px-6 375:px-7 sm:px-6 lg:px-8 py-7 375:py-8">
```

### Card
```tsx
<div className="rounded-2xl p-5 320:p-6 375:p-7 border border-white/[0.08]">
```

### Button
```tsx
<button className="touch-target-wide px-6 py-3.5 text-sm 375:text-base rounded-2xl">
```

### Grid
```tsx
<div className="grid grid-cols-1 375:grid-cols-2 tablet:grid-cols-3 gap-5 375:gap-6">
```

### Heading
```tsx
<h1 className="text-2xl 375:text-3xl tablet:text-4xl desktop:text-5xl font-bold">
```

### Body Text
```tsx
<p className="text-sm 375:text-base tablet:text-lg leading-relaxed">
```

## Breakpoint Decision Tree

```
Is it mobile-only content?
├─ Yes → Use 320: and 375: breakpoints
└─ No
   └─ Does it need tablet optimization?
      ├─ Yes → Use tablet: (768px)
      └─ No → Use desktop: (1440px)

Is it a touch target?
├─ Yes → Add touch-target or touch-target-wide
└─ No → Continue

Is it text content?
├─ Yes → Ensure minimum 14px on mobile
└─ No → Continue

Does it need iOS safe areas?
├─ Yes → Add safari-safe-* classes
└─ No → Done
```

## Testing Checklist

For each page/component:

- [ ] Test at 320px (iPhone SE)
  - [ ] No horizontal overflow
  - [ ] Touch targets ≥ 44px
  - [ ] Text ≥ 14px
  - [ ] Comfortable padding

- [ ] Test at 375px (iPhone 14)
  - [ ] Smooth scaling from 320px
  - [ ] Touch targets ≥ 44px
  - [ ] Text readable

- [ ] Test at 450px (Foldable)
  - [ ] Grid optimization
  - [ ] No wasted space

- [ ] Test at 768px (iPad Portrait)
  - [ ] Grid columns appropriate
  - [ ] Spacing comfortable

- [ ] Test at 1024px+ (Desktop)
  - [ ] Max content width
  - [ ] Sidebar layouts work

## Common Mistakes to Avoid

❌ **Don't:**
```tsx
// Jumping from mobile to desktop
className="px-4 lg:px-8"

// Fixed heights on buttons
className="h-[42px]"

// Small text on mobile
className="text-xs"

// No touch target guarantee
<button className="px-2 py-1">
```

✅ **Do:**
```tsx
// Progressive scaling
className="px-5 320:px-6 375:px-7 sm:px-8"

// Touch target guarantee
className="touch-target-wide"

// Readable text on mobile
className="text-sm 375:text-base"

// Touch-friendly buttons
<button className="touch-target-wide px-6 py-3.5">
```

## Migration Examples

### Before (Standard Tailwind)
```tsx
<div className="px-4 sm:px-6 lg:px-8">
  <button className="px-4 py-2 text-sm">
    Click Me
  </button>
</div>
```

### After (Custom Breakpoints)
```tsx
<div className="px-5 320:px-6 375:px-7 sm:px-6 lg:px-8">
  <button className="touch-target-wide px-6 py-3.5 text-sm 375:text-base">
    Click Me
  </button>
</div>
```

## Quick Reference Table

| Element | 320px | 375px | 450px | 768px | 1024px | 1440px |
|---------|-------|-------|-------|-------|--------|--------|
| Container Padding | 20px | 24px | 28px | 24px | 32px | 32px |
| Card Padding | 20px | 24px | 28px | 32px | 32px | 32px |
| Button Height | 44px | 44px | 44px | 44px | 44px | 44px |
| Body Text | 14px | 16px | 16px | 16px | 16px | 18px |
| Heading | 24px | 28px | 32px | 36px | 40px | 48px |
| Grid Gap | 20px | 24px | 24px | 24px | 24px | 32px |

## Resources

- [Tailwind Config](../tailwind.config.js)
- [Global CSS Utilities](../app/globals.css)
- [Full Documentation](./tailwind-extensions.md)
- [Implementation Summary](./RESPONSIVE_AUDIT_IMPLEMENTATION.md)
- [Automated Tests](../tests/e2e/responsive-split-savings.spec.ts)

---

**Last Updated:** 2026-04-29  
**Issue:** #376 - UX-010 Responsive Breakpoint Audit
