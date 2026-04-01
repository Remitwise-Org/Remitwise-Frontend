# Color Contrast And Status Semantics Inventory

Core components:
- `components/Bills/BillsCard.tsx`
- `app/insurance/page.tsx` `PolicyCard`
- `lib/ui/status-semantics.ts`

State inventory:
- Bills:
  success / paid
  warning / due soon
  error / overdue
  info / scheduled
  recurring meta label
  one-time meta label
- Insurance:
  success / active and on schedule
  warning / due soon
  error / overdue
  info / inactive
- Shared semantic states:
  icon + label + emphasis copy
  badge treatment
  panel treatment
  supporting meta color

Accessibility inventory:
- Badge labels remain readable without color
- Icons reinforce the state without replacing text
- Due-date and policy panels include explanatory copy so urgency survives grayscale and low-contrast viewing conditions

Open questions:
- Should success/warning/error/info tokens be expanded to form validation, async submission banners, and dashboard alerts in a follow-up pass?
- Should `urgent` bills keep using backend-provided status, or should the frontend derive urgency from due date for consistency with insurance?
- Should inactive policies later receive a neutral token instead of the current `info` mapping?
