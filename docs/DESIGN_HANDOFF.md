# Design Handoff

## Route mapping
- `/dashboard` — Main dashboard overview
- `/send` — Send Money flow
- `/split` — Smart Money Split configuration
- `/bills` — Bill payments and recurring bill setup
- `/insurance` — Micro-insurance policy management
- `/family` — Family wallet management and roles
- `/dashboard/goals` — Savings goals overview
- `/transactions` — Transaction history

## UI update summary
- Fixed `/transactions` so search uses the correct state variable and the page renders a valid layout.
- Added explicit USDC and non-custodial explanatory copy to the send, split, bills, insurance, family, and savings goals screens.
- Improved the visibility of wallet-signing expectations and on-chain action behavior in existing pages.

## Design gaps and current implementation status
- `Send Money` is a working wizard layout, but the wallet signature / transaction submission flow remains placeholder.
- `Smart Split` has a strong contract-state pattern, but the form is still disabled until contract integration is connected.
- `Bills` has a bill creation form and async status UX, but the actual contract payload creation and wallet approval flow are not wired.
- `Insurance` has active policy cards and form structure; contract and premium payment interactions are notes only at present.
- `Family Wallets` has member form UI, but actions are intentionally disabled until the smart contract integration is available.
- `Savings Goals` has a goal dashboard and a modal placeholder, with a note that goal creation is still to be implemented.

## Design constraints and engineering notes
- Existing Tailwind tokens are used for spacing and focus states.
- No new `tailwind.config.js` tokens were required for the current updates.
- Use current color palette of dark backgrounds, red accent, and gray text for contrast and readability.
- Keep touch targets at least 44px high on primary buttons.

## Open questions
1. Should USDC and non-custodial copy be shown on every outbound action, or only on contract/confirmation screens?
2. Should smart-split contract payloads be prepared before the wallet step, or should the wallet modal appear immediately after form submission?
3. What exact validation should appear for recurring bill frequency, due date, and owner-only bill actions?
4. Should the savings goals route be mirrored at `/goals` or remain only under `/dashboard/goals`?
5. How should transaction history distinguish between on-chain pending, wallet-pending, and completed states in the UI?

## Testing checklist
1. Run `npm install` if needed.
2. Start the app with `npm run dev`.
3. Open and verify these routes in the browser:
   - `/dashboard`
   - `/send`
   - `/split`
   - `/bills`
   - `/insurance`
   - `/family`
   - `/dashboard/goals`
   - `/transactions`
4. Confirm each page renders successfully with no console errors.
5. Validate search on `/transactions` and confirm it filters the sample list.
6. Check touch target and focus state behavior for primary buttons.
7. Confirm the explanatory USDC/non-custodial copy appears on the updated pages.
8. Document any remaining placeholder actions or integration notes.
