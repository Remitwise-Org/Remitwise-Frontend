# UX Error States

This document provides contributors with the standard error copy tone, layout, and implementation patterns used across the RemitWise frontend. By following these guidelines, you ensure our error states remain consistent, helpful, and professional.

## Tone and Voice

When writing error copy for users, our tone should be:
- **Direct**: State exactly what went wrong without using technical jargon or blaming the user.
- **Actionable**: Always provide a clear next step or resolution path (e.g. a retry button, a link to settings).
- **Empathetic but professional**: Avoid overly colloquial language or jokes during failure states.

## Layout and Implementation

We standardise error states into three primary patterns:

### 1. Page-Level Errors (Full Route Failures)

Use this pattern when an entire route fails to load (e.g. network failure on initial data fetch). 

**Concrete Example:**
```tsx
import WidgetErrorState from '@/components/ui/WidgetErrorState';

export default function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-6">
      <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
        <WidgetErrorState
          message="We couldn't load your dashboard summary. Please check your connection and try again."
          onRetry={onRetry}
        />
      </div>
    </div>
  );
}
```

### 2. Inline Form Errors

Use this pattern for validation failures directly next to the input field causing the error.

**Concrete Example:**
```tsx
<div className="flex flex-col space-y-1">
  <input 
    type="text" 
    className="border-red-500 text-red-100" 
    aria-invalid="true" 
    aria-errormessage="email-error"
  />
  <span id="email-error" className="text-sm text-red-500">
    Please enter a valid email address.
  </span>
</div>
```

### 3. Toast Notifications

Use this pattern for transient errors that don't block the user's current flow (e.g. a background sync or non-critical preference save failing).

**Concrete Example:**
```tsx
import { toast } from 'react-hot-toast';

// Somewhere inside a try/catch block handling a background request
toast.error("Failed to update preferences. Try again in a moment.");
```
