# Motion Vocabulary

**Audience: Contributors**

This document covers our standard motion vocabulary, ensuring that interface animations and transitions remain consistent across the RemitWise platform. Consistent motion builds trust and reduces cognitive load by keeping interactions predictable.

## When to Use Motion

Use motion to:
- Guide attention to a new or changing element (e.g., a toast notification).
- Provide feedback after an interaction (e.g., a button press).
- Indicate system status (e.g., a loading shimmer).

## Duration Tokens

We rely on Tailwind CSS's default duration scale for standard transitions. Use these durations to ensure motion feels responsive and not sluggish.

| Class | Duration | Usage |
| --- | --- | --- |
| `duration-150` | 150ms | **Micro-interactions:** Button hovers, toggle switches, checkbox states. |
| `duration-200` | 200ms | **State changes:** Dropdown menus opening, focus rings appearing. |
| `duration-300` | 300ms | **Component mounting:** Modals, dialogs, sliding panels. |

**Example:**
```tsx
<button className="bg-brand-red hover:bg-brand-redHover transition-colors duration-150">
  Send Money
</button>
```

## Easing Tokens

Easing defines the acceleration curve of an animation. We primarily use the default Tailwind easing functions.

| Class | Curve | Usage |
| --- | --- | --- |
| `ease-out` | Decelerating | Elements entering the screen (starts fast, slows down). |
| `ease-in` | Accelerating | Elements leaving the screen (starts slow, speeds up). |
| `ease-in-out` | Both | Elements moving from one point to another without entering/exiting. |
| `ease-linear` | Constant | Continuous background motion like loading spinners. |

**Example:**
```tsx
<div className="transition-opacity duration-200 ease-out opacity-100">
  Content visible
</div>
```

## Custom Animations

For more complex interface needs, we have custom keyframes defined in `tailwind.config.js`.

### 1. Slide In
Used for components that enter from off-screen, such as toasts or side navigation.

- **`animate-slide-in-right`**: (0.25s, `ease-out`) Used for side panels entering from the right.
- **`animate-slide-in-bottom`**: (0.25s, `ease-out`) Used for toasts or bottom sheets.

**Example:**
```tsx
<div className="animate-slide-in-bottom bg-status-success-bg p-4 rounded shadow">
  Transaction successful
</div>
```

### 2. Loading States
Used to indicate that the system is processing data.

- **`animate-shimmer`**: (2s, `linear`, infinite) Used on skeleton components to indicate loading content.
- **`animate-neon-pulse`**: (2s, `cubic-bezier(0.4, 0, 0.6, 1)`, infinite) Used to highlight ongoing critical processes or premium tier features.

**Example:**
```tsx
// Shimmer effect on a loading skeleton
<div className="h-4 w-full bg-gray-200 rounded animate-shimmer" />
```
