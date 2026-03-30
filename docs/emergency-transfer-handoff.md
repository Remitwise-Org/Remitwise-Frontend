# Emergency Transfer Handoff

## Route mapping

- Primary route: `/send`
- Components: `app/send/components/EmergencyTransferCard.tsx` and `app/send/components/EmergencyTransferModal.tsx`

## Breakpoints

- Mobile: `375px` and up
- Tablet: `768px` and up
- Desktop: `1280px` and up

## Layout notes

- The card and modal use the same visual language: rounded `3xl` surfaces, red-accent badge, destructive warning callout, and primary red action.
- Emergency-specific information is kept in one reading path: description, impact summary, warning, then action.
- No new Tailwind tokens were introduced. The update stays within existing utility usage and the current red-on-dark palette.

## Spacing and type

- Surface padding: `p-6` on mobile, `sm:p-8` on larger breakpoints.
- Section spacing: `gap-6` / `space-y-6` for primary content groups.
- Label text: `text-sm font-medium`.
- Heading text: `text-2xl sm:text-3xl font-semibold`.
- Critical totals and destructive cues use white/red contrast on dark backgrounds for WCAG-oriented legibility.

## Component states

- Card default: neutral destructive teaser with warning copy and enabled review CTA.
- Card hover/focus: stronger border and visible red focus ring on the CTA.
- Modal default: open state with warning callout, editable amount, and disabled primary CTA until acknowledgement + valid amount.
- Modal focus: close button, checkbox, and actions use visible `focus-visible:ring-2` styles with offset.
- Modal disabled: primary CTA uses reduced opacity and `not-allowed` cursor.
- Modal error-prevention: amount under `1 USDC` blocks progression and shows helper copy near the field.
- Loading/error: not implemented in code yet; future network states should replace the primary CTA label and preserve the warning + summary region.

## Interaction notes

- Opening the card launches the modal from `/send`.
- The modal closes on overlay click, close button, `Cancel`, or `Escape`.
- Touch targets for primary interactive elements are at least `40px`, with main actions sized for mobile thumb reach.

## Open questions

- Should the 2% emergency fee be capped or rounded differently for small-value transfers?
- Do contract-level limits exist for emergency sends that should be surfaced before confirmation?
- Should emergency transfer copy mention expected settlement times once backend guarantees are defined?
