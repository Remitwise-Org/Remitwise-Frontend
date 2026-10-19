# Spacing Tokens Guide

This document explains the spacing tokens available in RemitWise Frontend and when to use each. It is intended for **contributors** to ensure consistent spacing and sizing across the application.

By standardizing spacing, we let reviewers verify behavior against intent and help new contributors become productive quickly.

## Design Philosophy

We use semantic spacing tokens (`space-xs` through `space-xl`) for general UI composition, and a fine-grained scale (like `11`, `15`) when explicit sizing is required (e.g., meeting accessibility standards for touch targets).

**Do not hard-code arbitrary values** (like `12px` or `margin-top: 10px`). Always use the tokens defined in the Tailwind configuration.

## Semantic Tokens

Semantic tokens represent the relationships between elements. Use these for margins, padding, and gaps in layouts.

| Token | Value | Tailwind Class Example | When to Use |
| --- | --- | --- | --- |
| `space-xs` | `4px` | `gap-space-xs`, `p-space-xs` | Tight grouping of highly related elements, like an icon and its label inside a button. |
| `space-sm` | `8px` | `mt-space-sm`, `gap-space-sm` | Spacing between related items within a component, like list items in a dropdown menu. |
| `space-md` | `16px` | `p-space-md`, `mb-space-md` | Default padding inside components (cards, modals) or spacing between distinct components. |
| `space-lg` | `24px` | `p-space-lg`, `gap-space-lg` | Generous padding for prominent containers, or spacing between major sections in a form. |
| `space-xl` | `32px` | `mb-space-xl` | Spacing between major page sections or isolating hero elements from the rest of the content. |

### Concrete Examples

**Good (Using Semantic Tokens):**

```tsx
// A card component with standard internal padding and spacing between its elements
export function UserProfileCard() {
  return (
    <div className="p-space-md bg-white rounded-lg shadow">
      <div className="flex items-center gap-space-sm">
        <Avatar />
        <div className="flex flex-col gap-space-xs">
          <span className="font-bold">Alice</span>
          <span className="text-sm text-gray-500">Member since 2024</span>
        </div>
      </div>
      
      <div className="mt-space-lg">
        <Button>Send Money</Button>
      </div>
    </div>
  );
}
```

## Fine-Grained Responsive Scale

In addition to semantic tokens, we have a fine-grained scale used primarily for fixed dimensions, explicit touch targets, and precise alignments.

| Token | Value | Tailwind Class Example | When to Use |
| --- | --- | --- | --- |
| `3.5` | `14px` | `h-3.5`, `w-3.5` | Small visual elements, tiny decorative icons. |
| `7` | `28px` | `h-7`, `w-7` | Small inline form controls or badges. |
| `9` | `36px` | `h-9` | Standard dense button height. |
| `11` | `44px` | `h-11`, `w-11` | **Touch target minimum** (WCAG 2.1 AAA). Use this for primary interactive elements on mobile. |
| `13` | `52px` | `h-13` | Large buttons or prominent inputs. |
| `15` | `60px` | `h-15`, `w-15` | Avatars, large icon containers, or summary stat blocks. |
| `17.5` | `70px` | `h-17.5` | Very large emphasis UI elements. |
| `22.5` | `90px` | `h-22.5` | Marketing components, hero illustrations. |
| `27.5` | `110px` | `h-27.5` | Empty state illustrations or major layout blocks. |

### Concrete Examples

**Good (Accessible Touch Targets):**

```tsx
// Ensure a mobile navigation button meets WCAG AAA standards (44px)
export function MobileMenuButton({ onClick }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-center w-11 h-11 bg-brand-dark text-white rounded"
      aria-label="Open menu"
    >
      <MenuIcon className="w-5 h-5" />
    </button>
  );
}
```

## Related Documentation

- [Theming and Design Tokens](./THEMING.md) - Full catalogue of CSS custom properties, colors, animations, etc.
- [Component Naming and Structure](./COMPONENT_NAMING.md) - Guidelines for naming components and their props.
