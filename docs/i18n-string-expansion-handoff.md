# en/es String Expansion Handoff

Route mapping:
- `/dashboard/transaction-history` -> `app/dashboard/transaction-history/page.tsx`
- Header and nav area -> `app/dashboard/transaction-history/components/transaction-history-header.tsx`
- Action buttons -> `app/dashboard/transaction-history/components/transaction-history-button.tsx`
- Search field -> `app/dashboard/transaction-history/components/transaction-history-search-input.tsx`
- Client locale lookup -> `lib/i18n/client.ts`
- Locale copy -> `lib/i18n/locales/en.json` and `lib/i18n/locales/es.json`

What changed:
- Added client-side locale reads for `en` and `es` so the route can consume `lib/i18n/locales/` on the frontend.
- Expanded copy for transaction-history navigation, action buttons, tabs, empty states, and alerts.
- Removed fixed-width assumptions that caused longer labels to fit only in English by chance.

Breakpoints:
- Mobile: header stacks into two rows, action buttons stretch full-width, and the search placeholder swaps to a shorter localized variant.
- Tablet: header remains readable with wrapped title/subtitle and buttons can sit side by side without clipping.
- Desktop: actions align to the right, tabs wrap naturally, and the logo remains visible without stealing space from the title.

Spacing and type:
- Header keeps the existing dark visual language but allows the title and subtitle to wrap.
- Buttons use a minimum touch height of `52px`, `px-4` horizontal padding, and wrapped centered labels.
- Tabs use `min-h-[44px]` and `whitespace-normal` behavior so longer labels can break onto a second line instead of truncating.
- Search input keeps a single-line field but uses a shorter mobile placeholder to avoid clipped instructional copy.

Component states:
- Hover: action buttons and back navigation gain subtle surface changes without shifting layout.
- Focus: back nav, buttons, and search input use visible focus rings on the dark background.
- Disabled/loading/error: unchanged behavior on this route, but translated empty and error text now respect locale selection.

Accessibility:
- Focus visibility was added to the back button and action buttons.
- Touch targets meet mobile-friendly sizing on buttons and tabs.
- No new color tokens were needed; the update stays within the existing Tailwind dark-surface palette.

Open questions:
- Should frontend locale selection follow browser language only, or should it read the saved user preference from profile data?
- Do product and engineering want accent marks preserved in source JSON once the repo encoding issue is resolved globally?
- Should the same client-side locale helper be rolled out to other dashboard routes in this repo?
