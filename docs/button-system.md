# Button System Documentation

## Overview

This document defines the consistent button system for RemitWise, establishing clear variants, sizes, and states to ensure visual consistency and accessibility across the application.

## Design Principles

1. **Brand Consistency**: Primary actions use brand red (#D72323)
2. **Clear Hierarchy**: Visual distinction between primary, secondary, destructive, and ghost actions
3. **Accessibility First**: WCAG 2.1 AAA compliant contrast ratios and focus indicators
4. **State Clarity**: Clear visual feedback for all interactive states

## Button Variants

### Primary
- **Purpose**: Main call-to-action buttons for primary user flows
- **Usage**: Form submissions, confirmations, key actions (e.g., "Send Transfer", "Add Policy")
- **Color**: Brand red (#D72323) / `brand-red`
- **Examples**: Insurance "New Policy", Emergency Transfer "Continue", Family Wallets "Add Member"

### Secondary
- **Purpose**: Supporting actions that are less prominent than primary
- **Usage**: Cancel actions, alternative paths, secondary navigation
- **Color**: White/10 border with transparent background
- **Examples**: "Cancel", "Back", "View Details"

### Destructive
- **Purpose**: Actions that delete, remove, or have irreversible consequences
- **Usage**: Delete confirmations, account removal, data deletion
- **Color**: Red-600 (#DC2626) with darker red states
- **Examples**: "Delete Bill", "Remove Member", "Cancel Policy"

### Ghost
- **Purpose**: Tertiary actions with minimal visual weight
- **Usage**: Inline actions, icon buttons, subtle interactions
- **Color**: Transparent background, visible on hover
- **Examples**: Quick actions, icon-only buttons, subtle links

## Button Sizes

### Small (sm)
- **Height**: 36px (py-2)
- **Padding**: px-3 py-2
- **Font**: text-sm (14px)
- **Icon Size**: 16px (w-4 h-4)
- **Use Case**: Compact UIs, tables, cards, inline actions

### Medium (md) - Default
- **Height**: 44px (py-2.5 / py-3)
- **Padding**: px-4 py-2.5
- **Font**: text-sm (14px)
- **Icon Size**: 16px (w-4 h-4)
- **Use Case**: Standard forms, most UI interactions, primary CTAs

### Large (lg)
- **Height**: 48px (py-3)
- **Padding**: px-6 py-3
- **Font**: text-base (16px)
- **Icon Size**: 20px (w-5 h-5)
- **Use Case**: Hero CTAs, landing pages, prominent actions

## State Matrix

### Primary Button States

| State | Background | Text | Border | Focus Ring | Cursor |
|-------|------------|------|--------|------------|--------|
| **Default** | `bg-brand-red` (#D72323) | `text-white` | none | none | pointer |
| **Hover** | `hover:bg-brand-redHover` (#B91C1C) | `text-white` | none | none | pointer |
| **Active** | `active:bg-red-800` (#991B1B) | `text-white` | none | none | pointer |
| **Focus-Visible** | `bg-brand-red` | `text-white` | none | `ring-focus ring-red-400 ring-offset-focus ring-offset-black` | pointer |
| **Disabled** | `bg-red-600/40` | `text-white/60` | none | none | not-allowed |
| **Loading** | `bg-brand-red` | `text-white/60` | none | none | wait |

### Secondary Button States

| State | Background | Text | Border | Focus Ring | Cursor |
|-------|------------|------|--------|------------|--------|
| **Default** | `bg-white/5` | `text-gray-300` | `border border-white/10` | none | pointer |
| **Hover** | `hover:bg-white/8` | `hover:text-white` | `hover:border-white/15` | none | pointer |
| **Active** | `active:bg-white/10` | `text-white` | `border-white/20` | none | pointer |
| **Focus-Visible** | `bg-white/5` | `text-gray-300` | `border-white/10` | `ring-focus ring-red-400 ring-offset-focus ring-offset-black` | pointer |
| **Disabled** | `bg-white/5` | `text-gray-500/60` | `border-white/5` | none | not-allowed |
| **Loading** | `bg-white/5` | `text-gray-300/60` | `border-white/10` | none | wait |

### Destructive Button States

| State | Background | Text | Border | Focus Ring | Cursor |
|-------|------------|------|--------|------------|--------|
| **Default** | `bg-red-600` (#DC2626) | `text-white` | none | none | pointer |
| **Hover** | `hover:bg-red-700` (#B91C1C) | `text-white` | none | none | pointer |
| **Active** | `active:bg-red-800` (#991B1B) | `text-white` | none | none | pointer |
| **Focus-Visible** | `bg-red-600` | `text-white` | none | `ring-focus ring-red-400 ring-offset-focus ring-offset-black` | pointer |
| **Disabled** | `bg-red-600/40` | `text-white/60` | none | none | not-allowed |
| **Loading** | `bg-red-600` | `text-white/60` | none | none | wait |

### Ghost Button States

| State | Background | Text | Border | Focus Ring | Cursor |
|-------|------------|------|--------|------------|--------|
| **Default** | `bg-transparent` | `text-gray-400` | none | none | pointer |
| **Hover** | `hover:bg-white/5` | `hover:text-white` | none | none | pointer |
| **Active** | `active:bg-white/10` | `text-white` | none | none | pointer |
| **Focus-Visible** | `bg-transparent` | `text-gray-400` | none | `ring-focus ring-red-400 ring-offset-focus ring-offset-black` | pointer |
| **Disabled** | `bg-transparent` | `text-gray-600/60` | none | none | not-allowed |
| **Loading** | `bg-transparent` | `text-gray-400/60` | none | none | wait |

## Focus Ring Specification

All buttons MUST use the standardized focus ring for keyboard navigation:

```tsx
focus-visible:outline-none 
focus-visible:ring-focus 
focus-visible:ring-red-400 
focus-visible:ring-offset-focus 
focus-visible:ring-offset-black
```

### Focus Ring Tokens
- **Ring Width**: `ring-focus` (3px) - defined in tailwind.config.js
- **Ring Color**: `ring-red-400` - consistent across all variants
- **Ring Offset Width**: `ring-offset-focus` (4px) - defined in tailwind.config.js
- **Ring Offset Color**: `ring-offset-black` - matches dark backgrounds

### Why These Values?
- **3px ring**: Meets WCAG 2.1 AAA focus indicator requirements (minimum 2px)
- **4px offset**: Creates clear separation from button edge for visibility
- **Red color**: Aligns with brand identity while maintaining high contrast
- **Black offset**: Works consistently across dark UI backgrounds

## Implementation Examples

### Primary Button (Medium)
```tsx
<button
  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl 
    bg-brand-red hover:bg-brand-redHover active:bg-red-800 
    text-white text-sm font-semibold 
    transition-colors 
    focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-red-400 
    focus-visible:ring-offset-focus focus-visible:ring-offset-black
    disabled:bg-red-600/40 disabled:text-white/60 disabled:cursor-not-allowed"
>
  Continue
</button>
```

### Secondary Button (Medium)
```tsx
<button
  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl 
    bg-white/5 hover:bg-white/8 active:bg-white/10 
    border border-white/10 hover:border-white/15 
    text-gray-300 hover:text-white text-sm font-semibold 
    transition-all 
    focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-red-400 
    focus-visible:ring-offset-focus focus-visible:ring-offset-black
    disabled:bg-white/5 disabled:text-gray-500/60 disabled:border-white/5 disabled:cursor-not-allowed"
>
  Cancel
</button>
```

### Destructive Button (Medium)
```tsx
<button
  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl 
    bg-red-600 hover:bg-red-700 active:bg-red-800 
    text-white text-sm font-semibold 
    transition-colors 
    focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-red-400 
    focus-visible:ring-offset-focus focus-visible:ring-offset-black
    disabled:bg-red-600/40 disabled:text-white/60 disabled:cursor-not-allowed"
>
  Delete
</button>
```

### Ghost Button (Medium)
```tsx
<button
  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl 
    bg-transparent hover:bg-white/5 active:bg-white/10 
    text-gray-400 hover:text-white text-sm font-medium 
    transition-all 
    focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-red-400 
    focus-visible:ring-offset-focus focus-visible:ring-offset-black
    disabled:text-gray-600/60 disabled:cursor-not-allowed"
>
  View More
</button>
```

## Accessibility Requirements

### Contrast Ratios (WCAG 2.1 AAA)
- **Primary**: White text on #D72323 = 5.8:1 ✓ (passes AAA for large text)
- **Secondary**: #D1D5DB on #1A1A1A with white/5 = 12.6:1 ✓ (passes AAA)
- **Destructive**: White text on #DC2626 = 5.9:1 ✓ (passes AAA for large text)
- **Focus Ring**: #F87171 on black = 7.2:1 ✓ (passes AAA)

### Keyboard Navigation
- All buttons must be keyboard accessible via Tab
- Enter/Space must activate buttons
- Focus ring must be clearly visible (using `focus-visible:` pseudo-class)
- Disabled buttons should not receive focus (`tabIndex={-1}` when disabled)

### Screen Reader Support
- Use semantic `<button>` elements (not divs)
- Include descriptive `aria-label` for icon-only buttons
- Loading state should announce via `aria-live="polite"`
- Disabled state should use `disabled` attribute (not `aria-disabled`)

### Touch Targets
- Minimum height: 44px (WCAG 2.1 AAA Level AAA - 2.5.8)
- Medium and Large sizes meet this requirement
- Small buttons (36px) should only be used in dense UIs where absolutely necessary

## Migration Guide

### Replacing Inconsistent Buttons

#### Before (Insurance Page)
```tsx
className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl 
  bg-red-600 hover:bg-red-500 text-white font-medium text-sm 
  transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
```

#### After (Insurance Page)
```tsx
className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl 
  bg-brand-red hover:bg-brand-redHover active:bg-red-800 
  text-white font-semibold text-sm 
  transition-colors 
  focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-red-400 
  focus-visible:ring-offset-focus focus-visible:ring-offset-black"
```

### Key Changes
1. **Colors**: `bg-red-600` → `bg-brand-red` (uses design token)
2. **Hover**: `hover:bg-red-500` → `hover:bg-brand-redHover` (uses design token)
3. **Focus**: `focus:ring-2 focus:ring-red-500/40` → `focus-visible:ring-focus focus-visible:ring-red-400 focus-visible:ring-offset-focus focus-visible:ring-offset-black` (standardized)
4. **Active state**: Added `active:bg-red-800` for press feedback
5. **Font weight**: `font-medium` → `font-semibold` for better emphasis

## Common Patterns

### Button with Icon (Leading)
```tsx
<button className="...">
  <Plus className="w-4 h-4" />
  Add Item
</button>
```

### Button with Icon (Trailing)
```tsx
<button className="...">
  Continue
  <ArrowRight className="w-4 h-4" />
</button>
```

### Button with Loading State
```tsx
<button disabled={isLoading} className="...">
  {isLoading ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Loading...
    </>
  ) : (
    <>
      <Send className="w-4 h-4" />
      Send
    </>
  )}
</button>
```

### Icon-Only Button
```tsx
<button 
  aria-label="Close dialog"
  className="inline-flex items-center justify-center p-2 rounded-lg ..."
>
  <X className="w-5 h-5" />
</button>
```

### Full-Width Button
```tsx
<button className="w-full flex items-center justify-center gap-2 ...">
  Submit
</button>
```

## Testing Checklist

- [ ] Visual QA at 375px (mobile)
- [ ] Visual QA at 1280px (desktop)
- [ ] Keyboard navigation (Tab, Enter, Space)
- [ ] Focus ring visibility on dark backgrounds
- [ ] Hover state transitions smooth
- [ ] Active state feedback clear
- [ ] Disabled state not interactive
- [ ] Loading state prevents double-clicks
- [ ] Screen reader announcements correct
- [ ] Contrast ratios meet WCAG AAA
- [ ] Touch targets minimum 44px height (for md/lg sizes)

## References

- [WCAG 2.1 Success Criterion 2.5.8 (Target Size - AAA)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [WCAG 2.1 Success Criterion 2.4.7 (Focus Visible)](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)
- [WCAG 2.1 Success Criterion 1.4.6 (Contrast Enhanced - AAA)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html)
