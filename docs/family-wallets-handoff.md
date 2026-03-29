# Family Wallets Handoff

Route mapping:
- `/family` -> `app/family/page.tsx`

Breakpoints:
- Mobile: default stack, single-column member cards, sidebar content flows below members.
- Tablet: `sm` and `md` breakpoints add side-by-side summary cards and a two-column member grid.
- Desktop: `xl` breakpoint pins the roles and add-member panels in a right rail for faster comparison while scanning member cards.

Why this layout:
- The page now follows a top-to-bottom scan path of summary, member risk review, then policy/reference content.
- Member cards are sorted by highest utilization first so review work starts with the members most likely to need attention.
- Role guidance is rewritten as comparison cards with "best for" and core permissions so users do not need to parse paragraph copy.

Spacing and type:
- Section wrappers use `rounded-3xl` cards with `p-6` on mobile and `sm:p-8` on larger screens.
- Section labels use `text-xs`, uppercase tracking around `0.24em`, and red accent text for quick landmarks.
- Primary headings use `text-2xl font-semibold`; card values use `text-3xl font-semibold`.
- Supporting copy stays at `text-sm` with `leading-6` for AA-friendly readability on dark backgrounds.

Component states:
- Header actions and copy buttons include visible `focus-visible` rings with offset against the dark page background.
- Member action buttons stay disabled until contract integration is ready; disabled opacity and cursor styles are included in code.
- Hover states are intentionally subtle on high-density cards to preserve readability and avoid unnecessary motion.
- Loading and error states are not yet wired to live data; engineering should mirror the existing card shells and preserve the same spacing when those states are added.

Interaction notes:
- The page header "Add Member" CTA scrolls to the add-member panel instead of acting like a dead control.
- Copying a Stellar ID swaps the icon to a confirmation checkmark for two seconds.
- The add-member form is presented as a ready-for-integration shell and should retain the current disabled treatment until backend wiring exists.

Tailwind / tokens:
- No `tailwind.config.js` extension is required for this pass.
- The implementation reuses existing red palette values and neutral dark surfaces, with a few per-component arbitrary-value gradients for visual hierarchy.

Open questions:
- Should member actions remain disabled until contract integration ships, or should they open a read-only details drawer first?
- Is `75%` the right threshold for "Needs review", or should product set a different alert level?
- Should admins count toward the same spending utilization reporting, or be excluded when they do not have a personal limit?
