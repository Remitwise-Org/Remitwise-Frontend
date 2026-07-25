# Frontend Component States Guide

This guide defines the design patterns, visual treatments, and implementation details for user interface states in the RemitWise platform. It is written for **frontend contributors** to ensure a consistent experience across form submissions, dashboard widgets, and data loading boundaries.

---

## Overview of Standard States

Every interactive UI component in RemitWise must explicitly handle six standard component states:

| State | Purpose | Visual Signature & Tokens |
| --- | --- | --- |
| **Default** | Resting/idle interactive state | `bg-black`, `border-white/10`, `text-white` |
| **Hover** | User hovers mouse over interactive element | `hover:border-white/20`, `hover:bg-brand.redHover` |
| **Focus** | Keyboard navigation or active input focus | `focus:ring-2`, `focus:ring-brand.red`, `focus:ring-offset-2` |
| **Disabled** | Action unavailable or request in-flight | `disabled:opacity-50`, `disabled:cursor-not-allowed` |
| **Error** | Form validation error or widget render failure | `bg-status-error-soft`, `text-status-error-fg` |
| **Loading** | Data fetching or background operation pending | Route-level `Skeleton` screens, inline `Loader2` spinners |

---

## 1. Default State

The **default state** represents components in their idle, interactive form ready for user interaction.

### Styling & Design Tokens
All styling utilizes Tailwind CSS and respects our global design tokens configured in `tailwind.config.js`. Avoid hardcoding hex colors, border radii, or spacing values.

Key interactive tokens:
- **Brand Accent**: `bg-brand.red` (`#DC2626`)
- **Container Background**: `bg-black` / `bg-[#0A0A0A]`
- **Borders**: `border-white/10`

### Concrete Example: Input Component Default State
```tsx
import React from 'react';

export interface TextInputProps {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}

export function TextInput({
  label,
  name,
  placeholder,
  defaultValue,
}: TextInputProps) {
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
        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg text-white placeholder-gray-500 transition-colors duration-200"
      />
    </div>
  );
}
```

---

## 2. Hover State

The **hover state** provides visual feedback when a user moves their cursor over interactive elements such as buttons, inputs, cards, and links.

### Visual Guidelines
- **Buttons**: Shift background tint to hover variant (`hover:bg-brand.redHover`).
- **Input Fields**: Increase border opacity/brightness (`hover:border-white/20`).
- **Interactive Cards & Items**: Subtle elevation or background highlight transition (`hover:bg-white/[0.04]`).

### Concrete Example: Button and Input Hover States
```tsx
import React from 'react';

export function ActionButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-brand.red hover:bg-brand.redHover text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
    >
      {children}
    </button>
  );
}
```

---

## 3. Focus State

The **focus state** guarantees accessibility (WCAG compliance) for keyboard users and screen readers during navigation.

### Visual Guidelines
- **Focus Ring**: Always apply `focus:outline-none focus:ring-2 focus:ring-brand.red focus:ring-offset-2 focus:ring-offset-black`.
- **Border Integration**: Clear border contrast when focused (`focus:border-transparent`).
- **Accessibility**: Never remove outline without providing a visible focus ring replacement.

### Concrete Example: Accessible Interactive Element
```tsx
import React from 'react';

export function AccessibleInput({ label, id }: { label: string; id: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-300">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand.red focus:ring-offset-2 focus:ring-offset-black focus:border-transparent transition-all"
      />
    </div>
  );
}
```

---

## 4. Disabled State

Interactive controls are placed in a **disabled state** for two reasons:
1. **In-Flight Requests**: Form inputs and submit buttons must be disabled during active submissions to prevent duplicate form submissions or double-spends.
2. **Feature Boundaries**: Features waiting for integration or prerequisite user input disable fields to guide the user flow.

### Visual Guidelines
- Apply `disabled:opacity-50` and `disabled:cursor-not-allowed`.
- Text color is muted (`text-gray-500` or `text-white/30`).
- Borders are softened (`border-white/5` or `border-gray-200/10`).

### Concrete Example: Form Field Disabled State
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
        readOnly
        className="w-full px-4 py-3 border border-white/5 bg-white/[0.02] rounded-lg text-white/50 cursor-not-allowed opacity-50 focus:outline-none"
      />
    </div>
  );
}
```

---

## 5. Error State

RemitWise handles **error states** at two levels: form validation / API responses and component / widget rendering failures.

### 5.1 Form & API Validation Errors
Form submissions utilize the [`useFormAction`](../lib/hooks/useFormAction.ts) hook. The hook handles error resolution priority and returns errors within the state object.

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
        className="w-full border border-white/10 bg-black text-white p-3 rounded-lg focus:ring-2 focus:ring-brand.red disabled:opacity-50" 
      />

      <button 
        type="submit" 
        disabled={isPending}
        className="w-full bg-brand.red hover:bg-brand.redHover text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

### 5.2 Widget & Render Errors
If an individual widget fails during rendering, a reusable `WidgetErrorBoundary` catches the failure, logs the incident via the server logging service, and renders `WidgetErrorState` without crashing the rest of the application.

- **Boundary Component**: [`components/ui/WidgetErrorBoundary.tsx`](../components/ui/WidgetErrorBoundary.tsx)
- **Fallback State UI**: [`components/ui/WidgetErrorState.tsx`](../components/ui/WidgetErrorState.tsx)

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

## 6. Loading State

To prevent layout shifts and provide a premium user experience, RemitWise uses route-level skeleton screens instead of generic spinners for major layout sections. Inline loading spinners are reserved for form submit action buttons.

### 6.1 Skeleton Screen Components
Located in [`components/ui/Skeleton.tsx`](../components/ui/Skeleton.tsx), the `Skeleton` components animate using a shimmer effect.

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

### 6.2 CSS Custom Properties & Selector Hooks
Skeletons and loader components expose custom CSS properties and semantic class/attribute hooks for layout styling:

#### CSS Custom Properties
- `--skeleton-bg-start`: Base/start background color of shimmer gradient.
- `--skeleton-bg-via`: Middle highlight color of shimmer gradient.
- `--skeleton-bg-end`: Base/end background color of shimmer gradient.

#### Selector Hooks
- **Base Skeleton block**: `.loading-skeleton` / `data-loading-state="skeleton"`
- **Skeleton Card**: `.loading-skeleton-card` / `data-loading-state="card"`
- **Skeleton List**: `.loading-skeleton-list` / `data-loading-state="list"`
- **Skeleton Chart**: `.loading-skeleton-chart` / `data-loading-state="chart"`

### 6.3 Button Loading Spinner
When submitting forms, action buttons display a loading spinner and transition text while disabling interactions:

```tsx
import { Loader2 } from 'lucide-react';

export function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center w-full bg-brand.red hover:bg-brand.redHover text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
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

## Related Documentation
- [Error Handling Strategy](error-handling.md) — Covers global error boundaries and logger configurations.
- [Form Action Hook Guide](use-form-action.md) — Explains state transitions during AJAX form requests.
- [Client API Guide](client-api.md) — Explains `apiClient` requests, retry delays, and session expiry flows.
- [Status Semantics Handoff](color-contrast-status-semantics-handoff.md) — Visual design specifications for semantic statuses.
- [Component Naming Conventions](COMPONENT_NAMING.md) — Naming and structure rules for UI components.
- [Component Lifecycle](COMPONENT_LIFECYCLE.md) — Handoff from design tokens to production components.
