# Async Operations and Contract Submissions Handoff

Route mapping:
- `/send` -> `app/send/page.tsx` and `app/send/components/EmergencyTransferModal.tsx`
- `/split` -> `app/split/page.tsx`
- `/bills` -> `app/bills/page.tsx`

Breakpoints:
- Mobile: keep the initiating form or modal first, then place the async stack inline below it so status remains in the same reading path.
- Tablet: preserve the same vertical order but allow denser stage cards and summary blocks side by side where space permits.
- Desktop: use a sticky right rail for duration and stacking guidance while the left column owns the initiating form, modal body, or action surface.

Placement rules:
- Validation errors stay attached to the triggering field.
- Contract-build and pre-signing states stay inline with the primary CTA.
- Wallet approval can escalate to a blocking modal or wallet sheet once the payload is ready.
- Submit and confirmation states move into a persistent stacked surface after the user signs.

Stacking rules:
- Show at most three visible operation cards at one time.
- Keep the newest active submission at the top of the stack.
- Compress queued and completed items into smaller cards instead of replacing the active item.
- On mobile, render the same stack inline below the initiating form or modal footer instead of floating it off-screen.

Duration guidance:
- Validation: 0-2 seconds
- Contract build: 2-6 seconds
- Wallet signature: 15-45 seconds
- Submit and confirmation: 5-30 seconds

Spacing and type:
- Primary async panels use `rounded-3xl` wrappers with `p-6` to `p-8`.
- Section labels use `text-xs` uppercase with wide tracking for landmarks.
- Titles use `text-2xl font-semibold`.
- Supporting copy uses `text-sm leading-6` for dark-surface readability.
- Stack cards use `rounded-2xl` containers with a visible border and status badge.

Component states:
- Idle: explain where the next async state will appear before the user starts.
- Pending: show a spinner and keep the message near the action that initiated work.
- Success: keep the confirmation card visible briefly after completion.
- Error: surface the problem inline first, then keep the persistent stack available if the user navigates.
- Disabled: buttons and blocked states should keep strong contrast plus obvious opacity and cursor changes.

Interaction notes:
- `Add Bill` now scrolls directly to the form section instead of acting like a dead header action.
- Emergency transfer now opens its modal from `/send` and shows the async model inside the flow.
- The split configuration screen uses the right rail as the reference pattern for contract-duration, placement, and stack behavior.

Accessibility:
- New and updated controls use visible `focus-visible` rings against dark backgrounds.
- Touch targets remain at least button-sized on mobile surfaces.
- Text and status badges stay within a dark neutral palette with bright accent colors intended to remain WCAG 2.1 AA friendly on the current backgrounds.

Tailwind / tokens:
- No `tailwind.config.js` extension is required for this pass.
- The implementation reuses existing red accents, neutral dark cards, and arbitrary-value gradients already used elsewhere in the app.

Open questions:
- Should the global confirmation stack dismiss automatically after success, or remain until the user clears it?
- Does product want a hard cap on concurrent submissions, or only a visual stack cap?
- Should wallet-signature timeouts have a distinct warning state before they become errors?
- Do emergency transfers need different copy for testnet versus mainnet contract submissions?
