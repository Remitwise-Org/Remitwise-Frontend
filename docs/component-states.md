# Frontend Component States Guide

This guide defines the design patterns, visual treatments, and implementation details for user interface states in the RemitWise platform. It is written for **frontend contributors** to ensure a consistent experience across form submissions, dashboard widgets, and data loading boundaries.

---

## 1. Default State (including Hover, Focus, and Active)

The default state represents components in their idle, interactive form. Design guidelines dictate that interactive elements must have clear visual cues for focus, hover, and active states.

### Styling & Theme Integration
All styling utilizes Tailwind CSS and respects our global design tokens configured in `tailwind.config.js`. Avoid hardcoding hex colors, border radii, or spacing values.

Key interactive tokens:
- **Brand Accent**: `bg-brand.red` (`#DC2626`)
- **Hover Accent**: `bg-brand.redHover` (`#B91C1C`)
- **Focus Rings**: Always use outline offsets and clear rings.

### Concrete Example
Here is the implementation of a standard input field using our Tailwind design tokens:

```tsx
import React from 'react';

export function TextInput({
  label,
  name,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label 
        htmlFor={name}
        className="block text-sm font-medium text-gray-300"
      >
        {label}
      </label>
      <input
        type="text"
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg text-white placeholder-gray-500 transition-colors duration-200 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-brand.red focus:border-transparent focus:ring-offset-2 focus:ring-offset-black"
      />
    </div>
  );
}
```

---

## 2. Loading State

To prevent layout shifts and provide a premium user experience, RemitWise uses route-level skeleton screens instead of generic spinners. Inline loading spinners are reserved for form submissions on buttons.

### 2.1 Skeleton Screen Components
Located in [`components/ui/Skeleton.tsx`](file:///c:/Users/HP/Remitwise-Frontend/components/ui/Skeleton.tsx), the `Skeleton` components animate using a shimmer effect.

We support three primary layout skeletons:
1. `SkeletonCard`: Standard placeholder block. Variants include `"default"`, `"stat"`, and `"chart"`.
2. `SkeletonList`: List layout wrapper. Variants include `"table"` and `"cards"`.
3. `DashboardLoadingSkeleton`: High-level dashboard shell.

#### Usage Example:
```tsx
import { SkeletonCard } from "@/components/ui/Skeleton";

export function WidgetLoading() {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-medium">Analytics Preview</h3>
      {/* Renders a stat card placeholder with animated shimmer */}
      <SkeletonCard variant="stat" />
    </div>
  );
}
```

### 2.2 Button Loading Spinner
When submitting forms, the action button should display a loading spinner and transition text while disabling interactions.

#### Usage Example:
```tsx
import { Loader2 } from 'lucide-react';

export function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center w-full bg-brand.red hover:bg-brand.redHover text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        "Confirm Transfer"
      )}
    </button>
  );
}
```

---

## 3. Disabled State

Interactive controls are placed in a disabled state for two reasons:
1. **In-Flight Requests**: Form inputs and submit buttons must be disabled during active submissions to prevent duplicate form submissions or double-spends.
2. **Feature Boundaries**: Features waiting for integration with USDC smart contracts or external providers disable fields to guide the user (e.g. [`NewPolicyForm.tsx`](file:///c:/Users/HP/Remitwise-Frontend/components/forms/NewPolicyForm.tsx)).

### Visual Rules
- Apply `disabled:opacity-50` and `disabled:cursor-not-allowed`.
- Text color is muted (`text-gray-500` or `text-white/30`).
- Borders are softened (`border-white/5` or `border-gray-200`).

### Concrete Example:
```tsx
import React from 'react';

export function DisabledField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <label className="block text-sm font-medium text-gray-400">{label}</label>
      <input
        type="text"
        value={value}
        disabled
        className="w-full px-4 py-3 border border-white/5 bg-white/[0.02] rounded-lg text-white/50 cursor-not-allowed opacity-50 focus:outline-none"
      />
    </div>
  );
}
```

---

## 4. Error State

RemitWise handles errors at two levels: form validation/API errors and component/widget render errors.

### 4.1 Form & API Errors
Form submissions utilize the [`useFormAction`](file:///c:/Users/HP/Remitwise-Frontend/lib/hooks/useFormAction.ts) hook. The hook handles error resolution priority and returns errors within the state object.

#### Usage Example:
```tsx
import { useFormAction } from '@/lib/hooks/useFormAction';

export function SendForm() {
  const [state, formAction, isPending] = useFormAction('/api/send');

  return (
    <form action={formAction} className="space-y-4">
      {/* Standard error banner using semantic red color tokens */}
      {state?.error && (
        <div className="p-3 bg-status-error-soft border border-status-error-border rounded-lg text-status-error-fg text-sm">
          {state.error}
        </div>
      )}

      {/* Inputs disabled during submission */}
      <input 
        type="number" 
        name="amount" 
        disabled={isPending}
        className="border border-white/10 bg-black text-white p-2 rounded" 
      />

      <button type="submit" disabled={isPending}>
        {isPending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

### 4.2 Widget & Render Errors
If an individual widget fails during rendering, a reusable `WidgetErrorBoundary` catches the failure, logs the incident via the server logging service, and renders `WidgetErrorState` without crashing the rest of the application.

- **Boundary Component**: [`components/ui/WidgetErrorBoundary.tsx`](file:///c:/Users/HP/Remitwise-Frontend/components/ui/WidgetErrorBoundary.tsx)
- **Fallback State UI**: [`components/ui/WidgetErrorState.tsx`](file:///c:/Users/HP/Remitwise-Frontend/components/ui/WidgetErrorState.tsx)

#### Usage Example:
```tsx
import WidgetErrorBoundary from '@/components/ui/WidgetErrorBoundary';
import MyWidgetComponent from './MyWidgetComponent';

export function DashboardLayout() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Wrap widgets individually to isolate errors */}
      <WidgetErrorBoundary widgetName="MyWidgetComponent">
        <MyWidgetComponent />
      </WidgetErrorBoundary>
    </div>
  );
}
```

---

## Related Documentation
For deep dives into related patterns, see:
- [Error Handling Strategy](file:///c:/Users/HP/Remitwise-Frontend/docs/error-handling.md) — Covers global error boundaries and logger configurations.
- [Form Action Hook Guide](file:///c:/Users/HP/Remitwise-Frontend/docs/use-form-action.md) — Explains state transitions during AJAX form requests.
- [Client API Guide](file:///c:/Users/HP/Remitwise-Frontend/docs/client-api.md) — Explains `apiClient` requests, retry delays, and session expiry flows.
- [Status Semantics Handoff](file:///c:/Users/HP/Remitwise-Frontend/docs/color-contrast-status-semantics-handoff.md) — Visual design specifications for semantic statuses.
