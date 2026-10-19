# DESIGN QA CHECKLIST

## Purpose
This checklist helps ensure design deliverables are implementation-ready for the Next.js app and aligned with accessibility, responsiveness, and the existing Tailwind-based design system.

## 1. Route Mapping
- [ ] Every design frame is mapped to a corresponding route under `app/`
- [ ] Route names are included in frame titles or annotations
- [ ] New routes are explicitly marked

## 2. Breakpoints
- [ ] Mobile layouts are included
- [ ] Tablet layouts are included
- [ ] Desktop layouts are included
- [ ] Layout behavior between breakpoints is noted
- [ ] Overflow and wrapping behavior is defined where applicable

## 3. Component States
- [ ] Default state
- [ ] Hover state
- [ ] Focus state
- [ ] Active state
- [ ] Disabled state
- [ ] Loading state
- [ ] Error state
- [ ] Empty state
- [ ] Success state where applicable

## 4. Accessibility (WCAG 2.1 AA)
- [ ] Color contrast meets WCAG 2.1 AA expectations
- [ ] Focus indicators are visible and consistent
- [ ] Touch targets are appropriately sized where applicable
- [ ] Form controls have labels and error guidance
- [ ] Icon-only controls include accessible naming guidance
- [ ] Reading order and heading hierarchy are clear

## 5. Tailwind Alignment
- [ ] Existing spacing scale is reused where possible
- [ ] Existing typography scale is reused where possible
- [ ] Existing colors, radius, and shadows are reused where possible
- [ ] Any new tokens are explicitly called out for engineering review
- [ ] One-off styles are minimized and justified

## 6. Handoff Readiness
- [ ] Frames are named by feature area
- [ ] Critical screens include redlines or dev mode specs
- [ ] Interaction notes are documented
- [ ] Known edge cases are documented
- [ ] Open questions are listed for product or engineering
- [ ] Engineering references are included where possible

## 7. Engineering Review
- [ ] Quick review completed with engineering
- [ ] Final handoff approved
- [ ] Follow-up items tracked separately

## Route Reference Example
Example route mapping:
- `/` → `app/page.tsx`
- `/dashboard` → `app/dashboard/page.tsx`
- `/settings` → `app/settings/page.tsx`

Every design frame should reference its corresponding route.