# API Documentation - Design Handoff Annotations

## Component Specifications

### Header Component
```
Height: 64px (h-16)
Background: rgba(255, 255, 255, 0.95) with backdrop-blur
Border: 1px solid #E5E7EB (bottom)
Padding: 16px 24px (px-4 sm:px-6 lg:px-8)
Position: Sticky top-0
Z-index: 50
```

**Logo Section:**
- Logo size: 32x32px (w-8 h-8)
- Logo-to-text gap: 12px (gap-3)
- Brand text: 18px font-bold, color #0A0A0A
- Divider: 1px x 24px, color #D1D5DB

**Navigation (Desktop):**
- Item spacing: 24px (gap-6)
- Font: 16px medium weight
- Active state: #D72323
- Hover: #B91C1C
- Focus: 2px solid #D72323 outline with 2px offset

**Mobile Menu Button:**
- Size: 40x40px (p-2, min 44px touch target)
- Icon: 24x24px
- Background hover: #F3F4F6
- Focus ring: 2px solid #D72323

### Hero Section
```
Background: Linear gradient from #0A0A0A to #374151
Padding: 32px 24px (py-8 sm:py-12, px-4 sm:px-6 lg:px-8)
Text color: White (#FFFFFF)
```

**Typography:**
- Main heading: 32px-64px (text-2xl sm:text-3xl lg:text-4xl) font-bold
- Description: 16px-18px (text-base sm:text-lg) color #D1D5DB
- Line height: 1.6 (leading-relaxed)

**Feature Badges:**
- Container: Flexbox with 16px gap (gap-4)
- Badge structure: 8px dot + 14px text
- Dot colors: Green (#10B981), Blue (#3B82F6), Purple (#8B5CF6)

### Swagger UI Container
```
Container: max-width 1280px, centered
Padding: 24px (px-4 sm:px-6 lg:px-8 py-6)
Background: White with rounded corners (rounded-lg)
Border: 1px solid #E5E7EB
Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
```

## Interactive States

### Button States
**Primary Button (Execute, Authorize):**
- Default: Background #D72323, text white
- Hover: Background #B91C1C
- Focus: 2px solid #D72323 outline, 2px offset
- Active: Background #991B1B
- Disabled: Opacity 0.5, cursor not-allowed

**Secondary Button:**
- Default: Background transparent, border #D1D5DB, text #374151
- Hover: Background #F9FAFB
- Focus: 2px solid #D72323 outline

### Operation Blocks
**Method Colors:**
- GET: #10B981 (green)
- POST: #3B82F6 (blue)
- PUT: #F59E0B (amber)
- DELETE: #EF4444 (red)
- PATCH: #8B5CF6 (purple)

**Responsive Behavior:**
- Desktop: Horizontal layout
- Mobile: Vertical stack with method badge above path

## Spacing System

### Container Spacing
```css
.container {
  max-width: 1280px; /* max-w-7xl */
  margin: 0 auto;
  padding: 0 16px; /* px-4 */
}

@media (min-width: 640px) {
  .container { padding: 0 24px; } /* sm:px-6 */
}

@media (min-width: 1024px) {
  .container { padding: 0 32px; } /* lg:px-8 */
}
```

### Section Spacing
- Header: 64px height (h-16)
- Hero: 32px-48px vertical padding (py-8 sm:py-12)
- Main content: 24px padding (py-6)
- Footer: 32px padding (py-8)

## Typography Scale

### Headings
```css
h1 { font-size: 2rem; font-weight: 700; } /* text-2xl font-bold */
h2 { font-size: 1.5rem; font-weight: 600; } /* text-xl font-semibold */
h3 { font-size: 1.25rem; font-weight: 600; } /* text-lg font-semibold */
```

### Body Text
```css
.body-large { font-size: 1.125rem; line-height: 1.6; } /* text-lg leading-relaxed */
.body-base { font-size: 1rem; line-height: 1.5; } /* text-base leading-normal */
.body-small { font-size: 0.875rem; line-height: 1.4; } /* text-sm */
```

## Color Specifications

### Brand Colors
```css
--brand-red: #D72323;
--brand-red-hover: #B91C1C;
--brand-red-active: #991B1B;
--brand-dark: #0A0A0A;
```

### Neutral Colors
```css
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-900: #111827;
```

### Status Colors
```css
--success: #10B981;
--info: #3B82F6;
--warning: #F59E0B;
--error: #EF4444;
```

## Accessibility Annotations

### Focus Indicators
- All interactive elements: 2px solid #D72323 outline
- Offset: 2px from element boundary
- Visible on keyboard navigation only

### Touch Targets
- Minimum size: 44x44px
- Adequate spacing between targets: 8px minimum
- Mobile menu items: 48px height for comfortable tapping

### Color Contrast Ratios
- Primary text on white: 21:1 (exceeds AA)
- Secondary text on white: 9.7:1 (exceeds AA)
- Brand red on white: 5.74:1 (exceeds AA)
- White text on brand dark: 21:1 (exceeds AA)

## Animation Specifications

### Transitions
```css
.transition-default {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-colors {
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out;
}
```

### Loading States
```css
.loading-spinner {
  animation: spin 1s linear infinite;
  width: 48px;
  height: 48px;
  border: 2px solid #E5E7EB;
  border-top-color: #D72323;
  border-radius: 50%;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Implementation Notes

### CSS Custom Properties
The design uses Tailwind CSS classes but can be implemented with custom CSS using the values above.

### JavaScript Interactions
- Mobile menu toggle: `useState` for open/closed state
- Swagger UI mounting: `useEffect` with loading state
- Responsive behavior: CSS media queries (no JS required)

### Performance Considerations
- Images: Use Next.js `Image` component with proper sizing
- Fonts: Inter font is already loaded in the app
- CSS: Scoped styles prevent conflicts with Swagger UI

### Browser Support
- Modern browsers: Full feature support
- IE11: Graceful degradation (basic layout, no advanced animations)
- Mobile browsers: Touch-optimized interactions