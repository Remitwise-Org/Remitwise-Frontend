# Scroll Isolation Guide

**Audience: Contributors**

When we open modals, sidebars, or dropdowns, we need to ensure that the main page underneath does not jump or scroll unexpectedly. This is known as "scroll isolation." This document outlines how we achieve this in the RemitWise frontend without relying on tribal knowledge.

## Why it Matters

Without proper scroll isolation, interacting with an overlay (like a modal) can cause the body of the page to scroll. This leads to a frustrating user experience where they lose their context or position on the page once the overlay is closed.

## How We Isolate Scroll Containers

We manage scroll isolation primarily by controlling the `overflow` property of the `<body>` when an overlay is active, and by using specific React patterns for overlays.

### The `useScrollLock` Pattern

Instead of manually toggling CSS classes, we use a consistent React hook (or Radix UI primitives, which handle this automatically for components like `Dialog` or `Popover`). If you are building a custom overlay that isn't based on an existing accessible primitive, you must explicitly lock the scroll.

### Concrete Example: Custom Modal

Here is a concrete example of how to implement scroll isolation in a custom component:

```tsx
import { useEffect } from 'react';

/**
 * A hook to lock body scrolling when a component mounts.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;
    
    // Save the original overflow value
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    
    // Clean up when unmounting or unlocking
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isLocked]);
}

// Usage in a component:
export function CustomModal({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) {
  // Lock scroll when the modal is open
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-h-[80vh] overflow-y-auto w-full max-w-md">
        {/* Modal content can scroll independently */}
        {children}
        <button onClick={onClose} className="mt-4 bg-primary text-white px-4 py-2 rounded">
          Close
        </button>
      </div>
    </div>
  );
}
```

### Important Design Rules

- **Respect the Design Tokens:** Do not hard-code colors or spacing. Use Tailwind utilities (e.g., `bg-black/50` for overlays, `rounded-lg` for radii) that map to our established tokens.
- **Inner Scrolling:** Make sure your overlay container uses `overflow-y-auto` and a constrained height (e.g., `max-h-[80vh]`) so that its own content can scroll while the body remains isolated.
- **Use Primitives First:** Before writing a custom overlay and using `useScrollLock`, check if a component in `components/ui/` (like `Dialog` or `Sheet`) already provides this functionality out of the box.

## Testing Your Implementation

Always verify your overlay:
1. Open the overlay.
2. Attempt to scroll the page using the mouse wheel, trackpad, and keyboard (arrow keys).
3. The background should remain completely static.
4. Close the overlay.
5. The background should be exactly where you left it, without jumping.
