# Tailwind Config Extensions

## Current Configuration Status (Updated: 2026-04-29)
✅ **Custom breakpoints added** - Mobile-first responsive design with 320px, 375px, 450px breakpoints  
✅ **Touch target spacing added** - WCAG 2.1 AAA compliant (44px minimum)  
✅ **Fine-grained spacing scale** - Responsive spacing tokens for smooth scaling  
✅ **iOS Safari safe areas** - Support for notch/Dynamic Island  

## Custom Breakpoints

### Responsive Breakpoint Scale
```javascript
screens: {
  '320': '320px',      // iPhone SE (smallest mobile)
  '375': '375px',      // iPhone 14 (primary mobile target)
  '450': '450px',      // Foldables and larger phones
  'tablet': '768px',   // iPad portrait
  'laptop': '1024px',  // iPad landscape
  'desktop': '1440px', // Desktop standard
}
```

**Usage Examples:**
```tsx
// Mobile-first padding progression
<div className="px-5 320:px-6 375:px-7 sm:px-8">

// Text size scaling
<h1 className="text-2xl 375:text-3xl tablet:text-4xl">

// Grid columns responsive
<div className="grid grid-cols-1 375:grid-cols-2 tablet:grid-cols-3">
```

## Spacing Scale

### Fine-Grained Responsive Spacing
```javascript
spacing: {
  '3.5': '14px',
  '7': '28px',
  '9': '36px',
  '11': '44px',     // Touch target minimum (WCAG 2.1 AAA)
  '13': '52px',
  '15': '60px',
  '17.5': '70px',
  '22.5': '90px',
  '27.5': '110px',
}
```

**Touch Target Utilities:**
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

.touch-target-wide {
  min-height: 44px;
  min-width: 88px;
}
```

**Usage Examples:**
```tsx
// Touch-compliant buttons
<button className="touch-target-wide px-6 py-3.5">

// Responsive spacing
<div className="gap-5 375:gap-7 tablet:gap-9">
```

## iOS Safari Safe Areas

### Safe Area Utilities
```css
.safari-safe-top { padding-top: env(safe-area-inset-top); }
.safari-safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safari-safe-left { padding-left: env(safe-area-inset-left); }
.safari-safe-right { padding-right: env(safe-area-inset-right); }
```

**Usage:**
```tsx
// Respect iPhone notch/Dynamic Island
<div className="min-h-screen safari-safe-bottom">
<header className="safari-safe-top">
```

## Responsive Design Patterns

### Mobile-First Typography
```tsx
// Minimum 14px on mobile (prevents iOS zoom)
<p className="text-sm 375:text-base tablet:text-lg">

// Headings scale smoothly
<h1 className="text-xl 375:text-2xl tablet:text-3xl desktop:text-4xl">
```

### Grid Layouts
```tsx
// Single column → 2 columns → 3 columns
<div className="grid grid-cols-1 450:grid-cols-2 xl:grid-cols-3 gap-5 375:gap-6">

// Stats cards progression
<div className="grid grid-cols-1 375:grid-cols-2 tablet:grid-cols-3 gap-4 375:gap-5">
```

### Padding Progression
```tsx
// Tight on small screens, comfortable on larger
<div className="p-5 320:p-6 375:p-7 sm:p-8">

// Container padding
<main className="px-5 320:px-6 375:px-7 sm:px-6 lg:px-8">
```

## Accessibility Compliance

### WCAG 2.1 Level AAA
- ✅ Touch targets: Minimum 44×44px
- ✅ Text size: Minimum 14px on mobile (16px preferred)
- ✅ Color contrast: Maintained across all breakpoints
- ✅ Focus indicators: 3px ring with 4px offset

### Touch Target Guidelines
```tsx
// All interactive elements
<button className="touch-target-wide">  // 44px × 88px minimum
<input className="touch-target">        // 44px × 44px minimum
<a className="touch-target">            // 44px × 44px minimum
```

## Testing Matrix

### Viewport Sizes to Test
| Viewport | Width | Device | Breakpoint |
|----------|-------|--------|------------|
| 320px | 320px | iPhone SE | 320: |
| 375px | 375px | iPhone 14 | 375: |
| 414px | 414px | iPhone 14 Plus | 375: |
| 450px | 450px | Foldables | 450: |
| 768px | 768px | iPad Portrait | tablet: |
| 1024px | 1024px | iPad Landscape | laptop: |
| 1440px | 1440px | Desktop | desktop: |

### Chrome DevTools Testing
```bash
# Open DevTools → Toggle Device Toolbar (Cmd+Shift+M)
# Test each viewport size
# Check for:
# - No horizontal overflow
# - Touch targets ≥ 44px
# - Text ≥ 14px on mobile
# - Consistent spacing
```

## Migration Guide

### Old → New Breakpoints
```tsx
// OLD (standard Tailwind)
sm:   640px  →  375:  375px (primary mobile)
md:   768px  →  tablet: 768px (iPad)
lg:  1024px  →  laptop: 1024px (landscape)
xl:  1280px  →  desktop: 1440px (desktop)

// NEW additions
320:  320px  (iPhone SE)
450:  450px  (foldables)
```

### Old → New Spacing
```tsx
// OLD
gap-4  (16px)  →  gap-5 375:gap-7 (20px → 28px)
p-6    (24px)  →  p-5 320:p-6 375:p-7 (20px → 24px → 28px)

// Touch targets
h-[42px]  →  touch-target-wide (44px minimum)
```

## API Documentation Colors (Existing)

### Colors (Already Defined)
```javascript
colors: {
  brand: {
    red: "#D72323",    // Used for primary actions, focus states
    dark: "#0A0A0A",   // Used for hero background, text
  },
  primary: {
    500: "#0ea5e9",    // Blue scale for info badges
    600: "#0284c7",
  }
}
```

## Best Practices

1. **Always use mobile-first approach**: Start with 320px, scale up
2. **Test on real devices**: Especially iOS Safari for safe areas
3. **Verify touch targets**: Use browser DevTools to measure
4. **Check text legibility**: Minimum 14px on mobile, 16px preferred
5. **Smooth transitions**: Use progressive breakpoints (320 → 375 → 450 → 768)
6. **Consistent spacing**: Use the defined scale (3.5, 7, 9, 11, 13, 15)

## Related Files

- `tailwind.config.js` - Breakpoint and spacing configuration
- `app/globals.css` - Safe area and touch target utilities
- `app/split/page.tsx` - Split Configuration responsive implementation
- `app/dashboard/goals/page.tsx` - Savings Goals responsive implementation
- `docs/responsive-audit-RECON.md` - Detailed audit findings

---

**Last Updated:** 2026-04-29 (Issue #376 - UX-010 Responsive Breakpoint Audit)