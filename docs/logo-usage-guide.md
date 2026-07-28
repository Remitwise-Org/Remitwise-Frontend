# RemitWise Logo Usage Guide

## Overview

This guide defines the official RemitWise logo system, including lockups, usage rules, and implementation across product surfaces.

## Logo Variants

### Icon-Only (logo-icon.svg)
- **Dimensions**: 44x44px
- **Use Cases**: Navigation headers, wallet dropdown, small UI elements
- **Background**: Dark backgrounds (default)
- **Minimum Size**: 24x24px
- **Clear Space**: 4px padding around the mark

### Icon-Only Light (logo-icon-light.svg)
- **Dimensions**: 44x44px
- **Use Cases**: Light backgrounds, white surfaces
- **Background**: Light backgrounds
- **Minimum Size**: 24x24px
- **Clear Space**: 4px padding around the mark

### Full Lockup (logo-full.svg)
- **Dimensions**: 180x44px
- **Use Cases**: Landing pages, marketing materials, email headers
- **Background**: Dark backgrounds (default)
- **Minimum Size**: 120x30px
- **Clear Space**: 8px padding around the mark

### Full Lockup Light (logo-full-light.svg)
- **Dimensions**: 180x44px
- **Use Cases**: Landing pages, marketing materials on light backgrounds
- **Background**: Light backgrounds
- **Minimum Size**: 120x30px
- **Clear Space**: 8px padding around the mark

### Favicon (favicon.svg)
- **Dimensions**: 32x32px
- **Use Cases**: Browser tabs, bookmarks, app icons
- **Background**: All backgrounds
- **Minimum Size**: 16x16px (scalable SVG)

## Color System

### Primary Gradient
- **Start**: #DC2626 (Red-600)
- **Mid**: #B91C1C (Red-700)
- **End**: #991B1B (Red-800)

### Text Colors
- **Dark Background**: #FFFFFF (White)
- **Light Background**: #1F2937 (Gray-800)

## Usage Rules

### Clear Space
- **Icon**: Minimum 4px padding on all sides
- **Full Lockup**: Minimum 8px padding on all sides
- Never place text or other elements within the clear space

### Minimum Sizes
- **Icon**: 24x24px minimum
- **Full Lockup**: 120x30px minimum
- **Favicon**: 16x16px minimum (SVG scales down)

### Background Variants
- Use dark variants on dark backgrounds (#111111, #000000)
- Use light variants on light backgrounds (#FFFFFF, #F3F4F6)
- Ensure minimum contrast ratio of 4.5:1 for accessibility

### Do Not
- Stretch or distort the logo
- Change the gradient colors
- Rotate the logo
- Add drop shadows or effects
- Use the logo on low-contrast backgrounds
- Modify the letter spacing or typography

## Implementation

### Navigation/Header
```tsx
// components/Nav/Logo.tsx
<Image 
  src="/logo-icon.svg" 
  width={40} 
  height={40} 
  alt="RemitWise Logo" 
/>
```

### Wallet Dropdown
```tsx
// components/WalletDropdown.tsx
<Image
  src="/logo-icon.svg"
  width={24}
  height={24}
  alt=""
  className="h-6 w-6"
  aria-hidden="true"
/>
```

### Favicon
```tsx
// app/layout.tsx
export const metadata: Metadata = {
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};
```

## Accessibility

- Always include `alt="RemitWise Logo"` for icon images
- Use `aria-hidden="true"` for decorative instances
- Ensure sufficient color contrast (4.5:1 minimum)
- Test with screen readers

## File Locations

- `/public/logo-icon.svg` - Icon for dark backgrounds
- `/public/logo-icon-light.svg` - Icon for light backgrounds
- `/public/logo-full.svg` - Full lockup for dark backgrounds
- `/public/logo-full-light.svg` - Full lockup for light backgrounds
- `/public/logo.svg` - Default icon (dark background)
- `/public/favicon.svg` - Browser favicon

## Testing

- Visual QA at 375px (mobile) and 1280px (desktop)
- Test on both dark and light themes
- Verify contrast ratios meet WCAG AA standards
- Check favicon rendering in multiple browsers

## Version History

- **v1.0** (2026-07-28): Initial official logo rollout
  - Replaced placeholder "R" logo
  - Added icon-only and full lockup variants
  - Added light background variants
  - Implemented across header, nav, wallet dropdown, and favicon
