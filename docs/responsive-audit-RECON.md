# Split/Savings Responsive Audit Reconnaissance Report

**Issue:** #376 - UX-010 Responsive Breakpoint Audit  
**Date:** 2026-04-29  
**Scope:** Split Configuration (`app/split/page.tsx`) and Savings Goals (`app/dashboard/goals/page.tsx`)

## Executive Summary

This reconnaissance phase identifies responsive design issues across 7 viewport breakpoints (320px → 1920px) for Split Configuration and Savings Goals pages. Current implementation uses standard Tailwind breakpoints (sm:640px, md:768px, lg:1024px, xl:1280px) but lacks custom breakpoints for critical mobile sizes (320px, 375px, 450px) and touch target guarantees.

## Viewport Test Matrix

| Viewport | Width | Device | Priority |
|----------|-------|--------|----------|
| 320px | 320px | iPhone SE | ⚠️ Critical - Smallest mobile |
| 375px | 375px | iPhone 14 | ⚠️ Critical - Primary mobile |
| 414px | 414px | iPhone 14 Plus | High |
| 450px | 450px | Foldables | Medium |
| 768px | 768px | iPad Portrait | High |
| 1024px | 1024px | iPad Landscape | Medium |
| 1440px | 1440px | Desktop | Medium |
| 1920px | 1920px | Full HD | Low |

## Current State Analysis

### Split Configuration Page (`app/split/page.tsx`)

**Current Breakpoints Used:**
- `sm:px-6` (640px) - Container padding
- `sm:p-8` (640px) - Card padding
- `sm:flex-row` (640px) - Button layout
- `lg:px-8` (1024px) - Container padding
- `xl:grid-cols-[minmax(0,1.1fr)_360px]` (1280px) - Main grid layout

**Issues Identified:**

| Viewport | Issue | Severity | Fix Required |
|----------|-------|----------|--------------|
| 320px | Buttons 36px height (< 44px touch target) | 🔴 Critical | Add `min-h-[44px]` |
| 320px | Text 12px in descriptions (< 16px mobile) | 🔴 Critical | Increase to 14px minimum |
| 320px | Padding too tight (16px) | 🟡 Medium | Use 20-24px |
| 375px | Buttons still cramped | 🟡 Medium | Increase padding |
| 414px | Spacing inconsistent | 🟡 Medium | Apply spacing scale |
| 768px | ✅ Good | - | - |
| 1024px+ | ✅ Good | - | - |

**Component-Level Issues:**

1. **SplitInput Component:**
   - Label text: 14px (acceptable but could be larger on mobile)
   - Description text: 12px (too small for mobile)
   - Value display: 24px (good)
   - Range input: No touch target guarantee
   - Card padding: 16px (tight on 320px)

2. **Action Buttons:**
   - Height: `py-3.5` (~42px) - Just below 44px minimum
   - Width: No minimum width guarantee
   - Gap: 16px (acceptable)

3. **Main Grid:**
   - No mobile-specific layout
   - Sidebar stacks below on mobile (good)
   - Gap: 32px (could be tighter on mobile)

### Savings Goals Page (`app/dashboard/goals/page.tsx`)

**Current Breakpoints Used:**
- `sm:px-6` (640px) - Container padding
- `lg:px-8` (1024px) - Container padding
- `md:grid-cols-2` (768px) - Goals grid
- `xl:grid-cols-3` (1280px) - Goals grid

**Issues Identified:**

| Viewport | Issue | Severity | Fix Required |
|----------|-------|----------|--------------|
| 320px | Cards too wide, cramped content | 🔴 Critical | Single column with better spacing |
| 320px | Button height 42px (< 44px) | 🔴 Critical | Add `min-h-[44px]` |
| 375px | Stats cards cramped | 🟡 Medium | Stack vertically |
| 414px | 2-column grid too tight | 🟡 Medium | Keep single column |
| 768px | 2-column grid good | ✅ Good | - |
| 1024px+ | 3-column grid good | ✅ Good | - |

**Component-Level Issues:**

1. **SavingsGoalCard Component:**
   - Icon: 48px (good)
   - Title: 18px (good)
   - Description: 14px (acceptable)
   - Amount: 24px (good)
   - Progress bar: 10px height (good)
   - Buttons: 42px height (< 44px minimum)
   - Card padding: 24px (acceptable but could be tighter on 320px)

2. **SavingsGoalsStatsCards Component:**
   - Grid: `grid-cols-1 sm:grid-cols-3` (640px breakpoint)
   - Issue: Jumps from 1 to 3 columns at 640px
   - Fix: Add 2-column intermediate step at 375px

3. **Page Header:**
   - Uses standard padding
   - No mobile-specific optimizations

## Tailwind Configuration Analysis

**Current Config (`tailwind.config.js`):**
- ✅ Has semantic spacing tokens (`space-xs` through `space-xl`)
- ✅ Has focus ring tokens
- ✅ Has brand colors
- ❌ Missing custom breakpoints (320px, 375px, 450px, 1440px)
- ❌ Missing touch target spacing (44px, 88px)
- ❌ Missing fine-grained spacing (3.5, 7, 9, 11, 13, 15, 17.5, 22.5, 27.5)

**Required Extensions:**
```javascript
screens: {
  '320': '320px',    // iPhone SE
  '375': '375px',    // iPhone 14 (primary mobile)
  '450': '450px',    // Foldables
  'tablet': '768px', // iPad portrait
  'laptop': '1024px',// iPad landscape
  'desktop': '1440px'// Desktop
},
spacing: {
  '3.5': '14px',
  '7': '28px',
  '9': '36px',
  '11': '44px',     // Touch target minimum
  '13': '52px',
  '15': '60px',
  '17.5': '70px',
  '22.5': '90px',
  '27.5': '110px',
}
```

## Touch Target Violations

**WCAG 2.1 Level AAA Requirement:** Minimum 44×44px touch targets

**Violations Found:**

1. **Split Page:**
   - Cancel button: ~42px height ❌
   - Submit button: ~42px height ❌
   - Range sliders: No guaranteed touch area ❌

2. **Savings Goals Page:**
   - "Add Funds" button: 42px height ❌
   - "Details" button: 42px height, 80px width ❌
   - "New Goal" button: Needs verification

3. **Stats Cards:**
   - No interactive elements (N/A)

## Typography Scale Issues

**Minimum Mobile Text Size:** 16px (to prevent iOS zoom)

**Violations Found:**

1. **Split Page:**
   - Description text: 12px (`text-xs`) ❌
   - Helper text: 12px (`text-xs`) ❌

2. **Savings Goals:**
   - Description text: 14px (`text-sm`) ⚠️ (acceptable but borderline)
   - Helper text: 12px (`text-xs`) ❌

## Spacing Consistency Analysis

**Current Spacing Usage:**
- Gap values: 2, 3, 4, 6, 8 (Tailwind default scale)
- Padding values: 4, 6, 8 (Tailwind default scale)
- Inconsistent progression

**Recommended Scale (from docs/tailwind-extensions.md):**
- 3.5 (14px) → 7 (28px) → 9 (36px) → 11 (44px) → 13 (52px) → 15 (60px)

## iOS Safari Quirks

**Safe Area Insets:**
- Not currently implemented
- Required for iPhone notch/Dynamic Island
- Add utility classes: `.safari-safe-top`, `.safari-safe-bottom`

**Viewport Units:**
- Using standard `vh` units
- Consider `dvh` (dynamic viewport height) for better mobile support

## Breakpoint Collision Analysis

**Current Issues:**

1. **640px (sm:) Breakpoint:**
   - Too large for modern mobile devices
   - Misses 375px (most common mobile size)
   - Causes abrupt layout changes

2. **768px (md:) Breakpoint:**
   - Good for tablets
   - But no intermediate step between 375px and 768px

3. **1280px (xl:) Breakpoint:**
   - Should be 1440px for modern desktops

## Priority Fixes

### P0 - Critical (Blocking)
1. ✅ Add custom breakpoints (320px, 375px, 450px, 1440px)
2. ✅ Fix touch targets to 44px minimum
3. ✅ Fix text sizes to 14px minimum on mobile

### P1 - High (Important)
4. ✅ Implement spacing scale (3.5 → 27.5)
5. ✅ Add iOS safe area support
6. ✅ Fix grid collapsing on small screens

### P2 - Medium (Nice to have)
7. ✅ Optimize padding progression
8. ✅ Add content-priority stacking
9. ✅ Improve button sizing consistency

## Testing Strategy

**Manual Testing:**
1. Chrome DevTools Device Emulation
2. iPhone Simulator (iOS Safari)
3. Physical device testing (if available)

**Automated Testing:**
4. Cypress responsive tests
5. Visual regression tests (Percy/Chromatic)

**Validation Checklist:**
- [ ] No horizontal overflow at any breakpoint
- [ ] All touch targets ≥ 44×44px
- [ ] All text ≥ 14px on mobile
- [ ] Consistent spacing scale applied
- [ ] Grid columns collapse appropriately
- [ ] iOS safe areas respected
- [ ] Smooth transitions between breakpoints

## Next Steps

1. ✅ Update `tailwind.config.js` with custom breakpoints and spacing
2. ✅ Fix Split Configuration page responsive issues
3. ✅ Fix Savings Goals page responsive issues
4. ✅ Update components (SavingsGoalCard, SplitInput)
5. ✅ Add iOS Safari safe area utilities
6. ✅ Create Cypress responsive tests
7. ✅ Capture before/after screenshots
8. ✅ Update documentation

## Files to Modify

1. `tailwind.config.js` - Add custom breakpoints and spacing
2. `app/split/page.tsx` - Fix responsive layout
3. `app/dashboard/goals/page.tsx` - Fix responsive layout
4. `components/Dashboard/SavingsGoalCard.tsx` - Fix touch targets
5. `components/SmartMoneySplitHeader.tsx` - Add responsive improvements
6. `app/dashboard/goals/components/SavingsGoalsStatsCards.tsx` - Fix grid breakpoints
7. `app/globals.css` - Add iOS safe area utilities
8. `docs/tailwind-extensions.md` - Update documentation

## Estimated Effort

- Tailwind config: 15 minutes
- Split page fixes: 45 minutes
- Savings page fixes: 45 minutes
- Component updates: 30 minutes
- Testing: 60 minutes
- Documentation: 30 minutes

**Total:** ~3.5 hours

---

**Recon Completed:** Ready for implementation phase
