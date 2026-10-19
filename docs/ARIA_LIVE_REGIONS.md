# ARIA Live Regions Guide

This guide explains when to use **polite** versus **assertive** live regions to ensure our web applications are fully accessible to users employing screen readers and other assistive technologies. Proper usage brings our behavior in line with WCAG 2.1 AA and our internal accessibility checklists.

## Overview

ARIA live regions allow you to announce dynamic content changes (like notifications, errors, or updates) to screen readers without requiring the user to shift focus. 

- `aria-live="polite"` (or `role="status"`): The screen reader waits until it finishes speaking the current task before announcing the change.
- `aria-live="assertive"` (or `role="alert"`): The screen reader interrupts its current speech immediately to announce the change.

## When to Use Polite (`aria-live="polite"` or `role="status"`)

Use a **polite** live region for non-critical information that a user should know but doesn't require their immediate attention. 

**Examples:**
- A "success" toast after saving settings.
- Informational messages (e.g., "Your wallet is in read-only mode").
- Status updates (e.g., "File uploaded").

**Why?** Polite regions do not interrupt the user. If they are reading a paragraph, the screen reader waits until the end of the sentence or block before chiming in with the polite notification.

## When to Use Assertive (`aria-live="assertive"` or `role="alert"`)

Use an **assertive** live region *only* for time-sensitive, critical information that requires immediate attention and action.

**Examples:**
- Form validation errors preventing submission.
- A session timeout warning (e.g., "You will be logged out in 30 seconds").
- System-critical errors (e.g., "Network disconnected. Cannot save changes.").

**Why?** Assertive regions interrupt the user abruptly. Overusing them creates a disruptive and frustrating experience for screen reader users.

## Concrete Example: Notice Component

In RemitWise, we map our alert roles based on the severity of the `Notice` variant. This provides a single source of truth and prevents developers from having to guess which ARIA role to apply.

```tsx
// components/Notice.tsx

export const NOTICE_VARIANTS = ["info", "warning", "error", "success"] as const;
export type NoticeVariant = (typeof NOTICE_VARIANTS)[number];

/**
 * Variants that demand immediate screen-reader attention use role="alert"
 * (assertive live region). Informational and success variants use role="status"
 * (polite live region) so they don't interrupt ongoing announcements.
 */
const VARIANT_ROLE: Record<NoticeVariant, "alert" | "status"> = {
  error: "alert",       // Assertive
  warning: "alert",     // Assertive
  info: "status",       // Polite
  success: "status",    // Polite
};

export default function Notice({ variant, children }: NoticeProps) {
  const role = VARIANT_ROLE[variant];

  return (
    <div 
      role={role} 
      aria-atomic="true"
      className="..."
    >
      {/* ... */}
      {children}
    </div>
  );
}
```

By setting `aria-atomic="true"`, the screen reader will announce the entire contents of the notice whenever any part of it changes, providing full context rather than a fragmented sentence.

## Testing Your Implementation

To ensure your live regions work properly:
1. **Screen Readers:** Verify the behavior manually with VoiceOver (macOS), NVDA (Windows), or TalkBack (Android).
2. **Keyboard-Only:** Make sure any interactive elements within the live region (like a "Dismiss" button) are reachable via the `Tab` key and operable with `Enter` or `Space`.
3. **Automated Testing:** Run Axe via Playwright or DevTools on routes implementing these patterns to catch basic violations.
