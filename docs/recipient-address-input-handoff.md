# Recipient Address Input Handoff

Feature area:
- Send money / recipient entry

Route mapping:
- `/send` -> `app/send/page.tsx`
- Component traceability -> `app/send/components/RecipientAddressInput.tsx`

Design source:
- Agreed design artifact for this implementation pass: repo handoff docs and live Tailwind implementation
- External Figma file: not attached in this repo-driven pass
- Engineering traceability source of truth: `app/send/components/RecipientAddressInput.tsx`

Primary user task:
- Enter, paste, or review a Stellar recipient address quickly and with enough feedback to avoid checksum-related send errors.

Audit summary:
- The original component only validated address shape with a regex, so it could accept a visually correct but checksum-invalid key.
- Clipboard actions were absent, forcing manual selection and increasing paste friction on mobile and desktop.
- There was no visible future hook for QR scanning, which made the intended roadmap invisible to product and engineering.
- Focus styling existed but was light for a dark surface; touch target sizing and status messaging were not fully articulated.

Why this layout:
- Primary actions now follow the user scan path from left to right before the field itself: `Paste`, `Copy`, then `Scan QR`.
- The input remains the visual anchor, with status feedback directly below it so users do not need to hunt for validation results.
- Recent recipients stay below the address field because they are a secondary shortcut rather than the primary entry path.
- Success and error callouts sit above the recents section so the user resolves address validity before moving further down the page.

Breakpoints covered:
- Mobile:
  page padding remains `px-4`
  action chips wrap into multiple rows
  input remains single-column with inline status icon
- Tablet:
  card spacing expands with `sm:p-10`
  action buttons can remain on one row in most widths
  helper and status copy keep full width under the field
- Desktop:
  the component stays in the left content rail of `/send`
  action chips remain inline and secondary content below keeps a clear top-to-bottom scan path

Spacing and layout specs:
- Outer card: `rounded-[2rem]`, `p-8`, `sm:p-10`, dark background with subtle glow layers
- Internal vertical rhythm: `space-y-6` for sections, `space-y-4` for input/action grouping, `space-y-2` for helper text and status
- Action buttons: minimum height `44px` via `min-h-11`
- Input: `px-5 py-4 pr-14` to preserve room for the validation icon
- Status callouts: `rounded-2xl`, `px-4 py-3`

Typography specs:
- Label: `text-xl font-bold tracking-tight`
- Input text: `text-sm font-mono`
- Helper copy: `text-[0.9375rem] leading-relaxed`
- Status text: `text-sm font-medium`
- Meta text / character counter: `text-xs` with uppercase tracking
- Action buttons: `text-sm font-semibold`

Interaction notes:
- Paste:
  reads from `navigator.clipboard.readText()`
  normalizes to uppercase and strips whitespace before validation
  shows transient confirmation or failure copy
- Copy:
  writes current field value to clipboard
  button label changes to `Copied` briefly after success
  remains disabled until the field has content
- QR:
  intentionally disabled
  marked `Soon` to preserve discoverability without implying a live scanner
- Recent recipients:
  still populate the field directly
  are normalized through the same formatting path as manual and pasted input
- Validation:
  checks prefix, length, base32 character set, then Stellar checksum
  status copy updates live and is connected with `aria-describedby`

Component states:
- Default / idle
- Typing / normalized input
- Valid checksum success
- Invalid prefix
- Invalid length
- Invalid character set
- Invalid checksum
- Paste success
- Paste failure
- Copy idle
- Copy success
- Copy failure
- Disabled QR future hook
- Recent recipient shortcut

Accessibility notes:
- WCAG 2.1 AA intent:
  focus indicators use `focus-visible` rings with offset against the dark card background
  controls use visible icon + text pairings so color is not the only status signal
  touch targets meet the practical 44px target on action buttons
- Input semantics:
  required state is exposed with `aria-required`
  invalid state is exposed with `aria-invalid`
  helper and status text are linked via `aria-describedby`
- Status messaging:
  live feedback uses `aria-live="polite"`
  success and error both use iconography plus text
- Contrast:
  primary text remains white or near-white on dark surfaces
  error and success accents are reinforced with borders/background tints rather than color alone

Tailwind and design system notes:
- Reused existing dark surfaces, white opacity borders, red accent focus treatment, and rounded large-card patterns already present in `/send`
- No `tailwind.config.js` extension is required for this pass
- No new design tokens are required

Annotated engineering handoff:
- Route: `/send`
- File: `app/send/components/RecipientAddressInput.tsx`
- Critical implementation areas:
  checksum and state logic around validation memoization
  clipboard affordances for paste/copy
  disabled QR hook for future scanner integration
  accessible helper and status relationships

Redline-equivalent notes for critical screen:
- Input left/right padding is asymmetrical to reserve icon space
- Validation icon remains right-aligned and non-interactive
- Action row is visually secondary to the input but precedes it in the flow for task speed
- Success and error callouts use the same box model to avoid layout jump when swapping states

Engineering review status:
- Quick engineering review artifact for this repo pass: implementation and handoff docs are aligned
- Formal product/design sign-off remains pending if an external design tool deliverable is required

Closure note:
- design: handoff ready in repo docs; engineering implementation aligned, external Figma sign-off pending if required
