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

## Panel redesign (2026-07): spotlight + collapse

`AsyncOperationsPanel` and `AsyncSubmissionStatus` were redesigned to stop the
stacked rail from competing with the primary form for attention. The rules
below supersede the older "always-stacked" description above where they
conflict.

Status tokens (`lib/asyncStatusTokens.ts`):
- Both components now read color, icon, and badge copy for a status from one
  shared table, `ASYNC_STATUS_VISUALS`, keyed by `active | queued | complete |
  failed`. `AsyncSubmissionStatus`'s idle/pending/success/error states map onto
  the same four tokens via `SUBMISSION_TO_ASYNC_TOKEN` (idle→queued,
  pending→active, success→complete, error→failed), so a red pulsing treatment
  always means "in flight" and an amber treatment always means "needs
  attention," regardless of which component is rendering it.
- `failed` uses a distinct `AlertCircle` icon (previously it reused the
  `queued` clock icon, which blurred the two states).

Active-item spotlight:
- The active operation (if any) always renders in full — title, detail,
  duration, and a pulsing "Live now" badge — directly under the queue header,
  outside the collapsible section. It is never hidden by the collapse toggle.
- This is the single most prominent element in the queue: larger icon well,
  a ring border, and full (non-truncated) detail copy.

Collapse/expand:
- Queued, complete, and failed items collapse behind one toggle by default,
  shown as a single summary row (e.g. "2 more items · 1 queued · 1 confirmed").
  Expanding reveals compact rows for each; each row still has its own
  per-item expand for detail + retry (failed only).
- This replaces the previous `max-h-[220px] overflow-hidden` clipping, which
  visually cut cards off without a clear affordance to see the rest.
- Expand state persists per browser session via `sessionStorage
  ('asyncPanelExpanded')`, unchanged from before.
- When there is no active operation and no queue items, the panel shows a
  single sentence explaining it will populate once a contract action starts,
  instead of rendering an empty queue section.

Placement (unchanged, restated for clarity):
- Desktop (`xl:` and up): the panel lives in a sticky top-right rail
  (`aside.xl:sticky.xl:top-6`) alongside the primary form.
- Mobile/tablet: the same panel renders inline, stacked below the initiating
  form, in normal document flow (no floating/fixed positioning).

Accessibility:
- A single `aria-live="polite"` region announces the active operation (or,
  absent one, the newest queue item) as `"<title>: <badge>"` on every status
  change — e.g. "Split configuration update: Live now" → "... : Confirmed".
- Expand/collapse toggles use `aria-expanded` + `aria-controls` and never call
  `.focus()` on any other element, so opening/closing the queue cannot steal
  focus from wherever the user currently is (e.g. the form they're filling
  in).

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
