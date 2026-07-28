# Route Transitions

**Audience: Contributors**

This guide explains how we handle page transitions in the RemitWise Next.js App Router frontend to ensure they feel native, tasteful, and accessible.

## Core Philosophy

1. **Keep it fast:** Route transitions should never delay the time-to-interactive.
2. **Respect user preferences:** Always disable motion if the user prefers reduced motion (use `motion-reduce` variants).
3. **Use CSS over JS where possible:** Next.js App Router supports CSS-based transition states via `template.tsx` without needing heavy animation libraries.

## Example: Fade and Slide

When navigating between sibling routes (like `/dashboard/transactions` and `/dashboard/goals`), we use a subtle fade-in and slide-up animation.

Instead of wrapping every page in a custom motion wrapper, we use the Next.js `template.tsx` file for the route group.

### Implementation

Create a `template.tsx` file in the route segment:

```tsx
// app/dashboard/template.tsx
import { ReactNode } from "react";

export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="animate-slide-in-bottom motion-reduce:animate-none motion-reduce:transition-none">
      {children}
    </div>
  );
}
```

### Why this works:
- `template.tsx` is unmounted and remounted on navigation between routes sharing the template.
- We rely entirely on Tailwind's custom keyframes (`animate-slide-in-bottom`) defined in `tailwind.config.js`.
- We use the `motion-reduce:` variants (`motion-reduce:animate-none`) so the transition instantly snaps for users with accessibility preferences.

## Using the `useTransition` Hook for Soft Navigations

When applying filters or pushing shallow route changes, we use the native React `useTransition` hook to coordinate the UI state.

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function FilterButton({ filterId }: { filterId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleFilter = () => {
    startTransition(() => {
      router.push(`?filter=${filterId}`, { scroll: false });
    });
  };

  return (
    <button
      onClick={handleFilter}
      disabled={isPending}
      className={`
        px-4 py-2 rounded-xl transition-all duration-200 
        ${isPending ? "opacity-50" : "opacity-100"}
        bg-white/5 hover:bg-white/10
      `}
    >
      Apply Filter {isPending && "..."}
    </button>
  );
}
```

This prevents the whole page layout from blocking and allows us to show localized feedback (like `opacity-50`) during the route state change.

## Related Docs
- [Motion Guide](./MOTION.md)
- [Component States](./component-states.md)
