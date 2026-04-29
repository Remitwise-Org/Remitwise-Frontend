# Send Money Flow — Interaction & State Inventory

Route: `/send` → `app/send/page.tsx`  
Step order (as implemented): **Recipient → Amount → Review**  
Step type: `"recipient" | "amount" | "review"`

Related docs:
- `docs/recipient-address-input-handoff.md` — layout, spacing, typography, accessibility for the recipient step
- `docs/recipient-address-input-state-inventory.md` — component-level state inventory for `RecipientAddressInput`
- `docs/recipient-address-input-open-questions.md` — open product/engineering questions

---

## Step 1: Recipient

Component: `app/send/components/RecipientAddressInput.tsx`  
Validation: `StrKey.isValidEd25519PublicKey` from `@stellar/stellar-sdk`  
Normalization: input is uppercased and whitespace-stripped on every change

### Address Input Field

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| default | Field is empty, no interaction yet | Blank input, placeholder visible, copy button disabled, status copy invites entry | `"Paste a Stellar wallet address to verify its checksum before sending."` |
| focus | User has focused the input | Focus ring (`focus-visible:ring-2 focus-visible:ring-red-500`) appears; no validation change until typing begins | — |
| filled / typing | User is typing or has typed; address does not yet pass all checks | Input normalizes to uppercase in real time; character counter `{n}/56 characters` appears; validation runs on every keystroke | Depends on sub-state below |
| invalid — wrong prefix | Address does not start with `G` | Red border (`border-red-500/60`), `AlertCircle` icon in field, red status text, red error callout | `"Recipient address must start with G."` |
| invalid — wrong length | Address starts with `G` but is not 56 chars | Red border, `AlertCircle` icon, character counter shows current count | `"Recipient address must be 56 characters. {n}/56 entered."` |
| invalid — bad characters | Address contains characters outside base32 (`A-Z`, `2-7`) | Red border, `AlertCircle` icon | `"Recipient address contains unsupported characters."` |
| invalid — checksum fail | Address is 56 chars and base32-valid but fails `StrKey` checksum | Red border, `AlertCircle` icon, red error callout | `"Checksum failed. Double-check the address before sending."` |
| success / valid | Address passes all checks including `StrKey` checksum | Green border (`border-emerald-500/40`), `CheckCircle2` icon in field, green status text, green success callout | `"Checksum verified. This is a valid Stellar public key."` / callout: `"Address checksum verified. You can safely continue to amount and send details."` |
| disabled | — | — | NOTE: The address input itself is never put into a disabled state by the current implementation. The Continue button is disabled when the address is invalid or empty, but the field remains interactive at all times. |
| submitting | — | — | NOTE: There is no submitting state on the address field. Submission happens at the Review step. |
| failure | — | — | NOTE: No network-level failure state exists. Validation is entirely local (checksum only). |

### Paste Button

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| default | Clipboard not yet accessed | Button enabled, `ClipboardPaste` icon + "Paste" label | `"Paste"` |
| pasted | Clipboard read succeeded | Transient confirmation shown for 1800 ms, then resets to idle | `"Address pasted from clipboard."` |
| error | Clipboard read failed (permissions or insecure context) | Transient error shown for 1800 ms, then resets to idle | `"Clipboard paste is unavailable in this browser context."` |

### Copy Button

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| disabled | Address field is empty | Button visually dimmed (`disabled:opacity-40 disabled:cursor-not-allowed`) | `"Copy"` |
| default | Address field has content | Button enabled | `"Copy"` |
| copied | Clipboard write succeeded | Button label changes for 1800 ms, then resets | `"Copied"` |
| error | Clipboard write failed | Transient error shown for 1800 ms | `"Copy failed. Try selecting the address manually."` |

### Scan QR Button

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| disabled (permanent) | QR scanning not yet implemented | Dashed border, reduced opacity (`text-white/55`), `aria-disabled="true"`, `disabled` attribute, tooltip on hover | `"Scan QR"` + `"Soon"` badge; tooltip: `"QR scanning is not yet available."` |

NOTE: QR scanning is intentionally parked. The button is always disabled regardless of address state. No runtime path exists to enable it.

### Recent Recipients

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| default | Chips visible below separator | Three hardcoded chips: "Family", "John D.", "Maria S." | Chip label only |
| selected | User clicks a chip | Address field is populated with the chip's hardcoded address, normalized, and validated immediately | — |

NOTE: Recent recipients are hardcoded. There is no loading state, no API call, and no empty state for when the list is empty.

### Continue Button

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| disabled | Address is empty or invalid | `disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed` | `"Continue to Amount"` |
| enabled | Address passes checksum validation | Red background (`bg-red-600`), hover darkens | `"Continue to Amount"` |

### Recipient Address Edge Conditions

| Condition | Implemented? | Current Behavior |
|---|---|---|
| Valid Stellar address (`G…` 56 chars, checksum passes) | ✅ Yes | Green success state, Continue enabled |
| Valid federation address (`user*domain.com`) | ❌ No | Treated as invalid — fails prefix check (`must start with G`) |
| Invalid format (wrong prefix, length, or characters) | ✅ Yes | Red error state with specific message per failure mode |
| Address not found on network | ❌ No | No network lookup; checksum-valid addresses always pass |
| Self-send (sender = recipient) | ❌ No | No check; user can enter their own address and proceed |

NOTE: Federation address support, network existence checks, and self-send prevention are not implemented. See `docs/recipient-address-input-open-questions.md` for open product questions on these gaps.

---

## Step 2: Amount

Component: `app/send/components/AmountCurrencySection.tsx`  
Validation: client-side only; min $1, max $10,000

### Amount Input

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| default | Field is empty | Placeholder `"0.00"`, `$` prefix visible, no error | `"Min: $1, Max: $10,000"` (hint below field) |
| focus | User has focused the input | Focus ring (`focus:border-red-500/50`) | — |
| filled / valid | Amount is a number between 1 and 10,000 inclusive | No error shown; Review Transaction button becomes enabled | — |
| invalid — empty | User clears the field after typing | Error cleared on empty (no error shown for blank); Review button disabled | — |
| invalid — NaN | Non-numeric characters entered | Error shown below field | `"Please enter a valid amount"` |
| invalid — below minimum | Amount < 1 | Error shown below field | `"Minimum amount is $1"` |
| invalid — above maximum | Amount > 10,000 | Error shown below field | `"Maximum amount is $10,000"` |
| disabled | — | — | NOTE: The amount input is never disabled by the current implementation. |
| submitting | — | — | NOTE: No submitting state on this field. Submission is at Review. |
| success | — | — | NOTE: No explicit success state on the amount field itself. Validity is communicated only by the absence of an error and the enabled Review button. |
| failure | — | — | NOTE: No network or submission failure state at this step. |

### Currency Selector

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| default | USDC selected | Dropdown shows USDC; conversion rate hint shown | `"1 USDC = $1.00 USD"` |
| changed | User selects XLM or EUR | Conversion rate hint updates to reflect selected currency | `"1 XLM = $0.28 USD"` / `"1 EUR = $0.92 USD"` |
| disabled | — | — | NOTE: Currency selector is never disabled. |

NOTE: Conversion rates are hardcoded (`USDC: 1.0`, `XLM: 0.28`, `EUR: 0.92`). There is no loading state, no rate-fetch failure state, and no staleness indicator.

### Review Transaction Button

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| disabled | Amount is empty, NaN, < 1, or > 10,000 | `disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed` | `"Review Transaction"` |
| enabled | Amount is valid | Red background (`bg-red-600`), hover darkens, `active:scale-[0.98]` | `"Review Transaction"` |

### Back Button (Amount Step)

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| default | Always enabled | Transparent background, zinc text, hover shows subtle white tint | `"Back to Recipient"` |

---

## Step 3: Review

Component: `app/send/components/ReviewStep.tsx`  
Split preview: `app/send/components/AutomaticSplitCard.tsx`

### Transaction Summary Display

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| default | Recipient address and amount/currency shown | Static display; no loading, no skeleton | Recipient label: `"Recipient"` / Amount label: `"Amount to Send"` |
| loading (exchange rate / fee) | — | — | NOTE: No loading state exists. Exchange rates and fees are not fetched. The review screen renders immediately with the values from previous steps. |
| fee calculation failure | — | — | NOTE: No fee calculation failure state exists. The only fee shown is the hardcoded 2% emergency fee in the Emergency Transfer modal. |

### Automatic Split Preview (`AutomaticSplitCard`)

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| default | Split percentages shown based on amount passed from parent | Static bars: Daily Spending 50%, Savings 30%, Bills 15%, Insurance 5% | `"Your remittance will be automatically split according to your configured allocation rules:"` |
| loading | — | — | NOTE: No loading state. Split percentages are hardcoded; no API call is made. |
| empty / zero amount | Amount prop is 0 | All dollar amounts display as `$0.00`; bars render at 0 width | — |

### Confirm & Send Button

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| idle | Ready to confirm | Red background (`bg-red-600`), `Zap` icon, hover darkens | `"Confirm & Send Remittance"` |
| submitting | — | — | NOTE: No submitting/loading state. `handleConfirm` in `page.tsx` runs synchronously: it builds mock transaction data and immediately sets `isSubmitted = true`. There is no async operation, no spinner, and no disabled state during processing. |
| success | Mock transaction data set | `TransactionSuccessReceipt` overlay renders with mock hash and split data | Handled by `TransactionSuccessReceipt` component (outside send flow scope) |
| failure | — | — | NOTE: No failure state. The confirm handler cannot fail in the current implementation. |
| transaction timeout | — | — | NOTE: No timeout handling exists. The mock confirm is synchronous. |

### Back Button (Review Step)

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| default | Always enabled | Transparent background, zinc text, `ArrowLeft` icon | `"Back to Amount"` |

### Emergency Transfer Option

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| default | Shown below the confirm button | Red-tinted card with `Zap` icon and link | Heading: `"Need it faster?"` / Body: `"Bypass split rules for immediate delivery. 2% fee applies."` / CTA: `"Switch to Emergency Transfer →"` |
| clicked | Opens `EmergencyTransferModal` | Modal overlays the page | — |

### Emergency Transfer Modal (`EmergencyTransferModal`)

| State | Description | UI Behavior | Microcopy / Error Text |
|---|---|---|---|
| closed | `isOpen = false` | Modal not rendered | — |
| open — default | Modal visible, no amount entered, Emergency speed selected | Amount input empty, priority fee shows `+2.00 USDC`, total shows `0.00 USDC`, confirm checkbox unchecked, submit button disabled | Speed labels: `"Emergency"` / `"Regular"` |
| speed: emergency | `speed === 'emergency'` | Emergency card highlighted (red tint), priority fee = 2 USDC | `"2-5 min"` / `"Highest priority path. Use for urgent household needs only."` |
| speed: regular | `speed === 'regular'` | Regular card highlighted (white tint), priority fee = 0 | `"30-60 min"` / `"Lower urgency flow."` |
| amount entered | User types a numeric amount | Transfer amount, priority fee, and total update in real time | — |
| checkbox unchecked | `confirmed = false` | Submit button disabled (`disabled:opacity-50 disabled:cursor-not-allowed`) | Checkbox label: `"I understand this is an emergency transfer, fees apply, and the confirmation state should persist after this modal closes."` |
| checkbox checked + amount > 0 | `confirmed = true && numericAmount > 0` | Submit button enabled | `"Review Transfer"` |
| submit disabled — no amount | Amount is 0 or empty | Button disabled even if checkbox is checked | — |
| submitting | — | — | NOTE: The "Review Transfer" button has no submission logic. Clicking it does nothing beyond what `AsyncSubmissionStatus` renders as a static design annotation. No actual transfer is initiated. |
| cancelled | User clicks Cancel or X | Modal closes, no state change to the parent flow | — |

---

## Microcopy Guidelines

All error messages currently in the codebase, with trigger conditions and tone guidance:

| Message | Trigger Condition | Component | Tone Guidance |
|---|---|---|---|
| `"Paste a Stellar wallet address to verify its checksum before sending."` | Address field is empty (idle) | `RecipientAddressInput` | Instructional, non-blaming; tells the user what to do next |
| `"Recipient address must start with G."` | Address does not begin with `G` | `RecipientAddressInput` | Factual; states the rule without blame |
| `"Recipient address must be 56 characters. {n}/56 entered."` | Address starts with `G` but length ≠ 56 | `RecipientAddressInput` | Factual with progress indicator; avoids blame, shows how far off the user is |
| `"Recipient address contains unsupported characters."` | Address contains characters outside `[A-Z2-7]` | `RecipientAddressInput` | Factual; does not accuse the user of a mistake |
| `"Checksum failed. Double-check the address before sending."` | Address is 56 chars and base32-valid but fails `StrKey` checksum | `RecipientAddressInput` | Cautionary; suggests action ("double-check") without blame |
| `"Checksum verified. This is a valid Stellar public key."` | Address passes all validation | `RecipientAddressInput` | Confirmatory; reassures the user before they proceed |
| `"Address checksum verified. You can safely continue to amount and send details."` | Address passes all validation (callout panel) | `RecipientAddressInput` | Reassuring; explicitly permits forward progress |
| `"Fix the recipient address before continuing. A valid Stellar public key must pass both format and checksum validation."` | Address is invalid (error callout panel) | `RecipientAddressInput` | Directive; tells the user exactly what to fix and why |
| `"Address pasted from clipboard."` | Clipboard paste succeeded | `RecipientAddressInput` | Confirmatory; brief transient feedback |
| `"Clipboard paste is unavailable in this browser context."` | `navigator.clipboard.readText()` threw | `RecipientAddressInput` | Explanatory; attributes the failure to the browser context, not the user |
| `"Copy failed. Try selecting the address manually."` | `navigator.clipboard.writeText()` threw | `RecipientAddressInput` | Suggests a workaround; avoids blame |
| `"Please enter a valid amount"` | Amount field contains non-numeric input | `AmountCurrencySection` | Instructional; avoids blame |
| `"Minimum amount is $1"` | Amount < 1 | `AmountCurrencySection` | Factual; states the constraint |
| `"Maximum amount is $10,000"` | Amount > 10,000 | `AmountCurrencySection` | Factual; states the constraint |
| `"Min: $1, Max: $10,000"` | Always visible below amount field (hint) | `AmountCurrencySection` | Preventive; sets expectations before the user makes an error |
| `"Need it faster?"` / `"Bypass split rules for immediate delivery. 2% fee applies."` | Always visible on Review step | `ReviewStep` | Informational; discloses the fee upfront |
| `"I understand this is an emergency transfer, fees apply, and the confirmation state should persist after this modal closes."` | Confirm checkbox in Emergency modal | `EmergencyTransferModal` | Consent-oriented; ensures the user acknowledges consequences |

**General tone guidance across the flow:**
- Avoid second-person blame ("you entered", "you made an error"). Prefer passive or factual framing.
- Error messages should state the rule or constraint, then suggest the corrective action.
- Success messages should explicitly permit forward progress, not just confirm validity.
- Transient clipboard messages should be brief (one sentence) and reset automatically.

---

## Edge Conditions Summary

| Edge Case | Step | Expected Behavior |
|---|---|---|
| Valid Stellar address (G… 56 chars, checksum passes) | Recipient | Green success state; Continue enabled |
| Federation address (`user*domain.com`) | Recipient | ❌ Treated as invalid — fails prefix check. NOTE: Not implemented. |
| Address with lowercase letters | Recipient | Normalized to uppercase on input; validated after normalization |
| Address with whitespace | Recipient | Whitespace stripped on input; validated after normalization |
| Address not found on Stellar network | Recipient | ❌ No network lookup. Checksum-valid addresses always pass. NOTE: Not implemented. |
| Self-send (sender address = recipient address) | Recipient | ❌ No check. User can proceed with their own address. NOTE: Not implemented. |
| Recent recipient chip selected | Recipient | Field populated with hardcoded address, normalized, validated immediately |
| Clipboard paste blocked by browser | Recipient | Paste error state shown for 1800 ms; user instructed to paste manually |
| Copy attempted with empty field | Recipient | Copy button is disabled; no action |
| QR scan attempted | Recipient | Button is permanently disabled; no action |
| Amount is empty | Amount | Review button disabled; no error shown for blank field |
| Amount is non-numeric | Amount | Inline error: `"Please enter a valid amount"` |
| Amount is exactly $1 | Amount | Valid; Review button enabled |
| Amount is exactly $10,000 | Amount | Valid; Review button enabled |
| Amount is $0.99 | Amount | Invalid; `"Minimum amount is $1"` |
| Amount is $10,000.01 | Amount | Invalid; `"Maximum amount is $10,000"` |
| Currency changed to XLM or EUR | Amount | Conversion rate hint updates; no validation impact on amount |
| Exchange rate unavailable | Amount | ❌ Not applicable — rates are hardcoded. NOTE: No failure state exists. |
| Review rendered with amount = 0 | Review | Split card shows all `$0.00` values; Confirm button remains enabled |
| Confirm clicked | Review | Synchronous mock: `TransactionSuccessReceipt` shown immediately with fake hash |
| Transaction submission failure | Review | ❌ Not implemented. No failure path exists in the current mock. |
| Transaction timeout | Review | ❌ Not implemented. Confirm is synchronous. |
| Emergency modal opened with no amount | Review → Modal | Submit button disabled; total shows `0.00 USDC` |
| Emergency modal: checkbox unchecked | Review → Modal | Submit button disabled regardless of amount |
| Emergency modal: Regular speed selected | Review → Modal | Priority fee = 0; total = transfer amount only |
| Emergency modal: submit clicked | Review → Modal | ❌ No submission logic. Button click has no effect beyond what `AsyncSubmissionStatus` renders as a static annotation. |
| Back navigation from Amount | Amount | Returns to Recipient step; previously entered recipient address is preserved in parent state |
| Back navigation from Review | Review | Returns to Amount step; previously entered amount and currency are preserved in parent state |
| Address Book button clicked | Header | ❌ No functionality. Button renders but has no `onClick` handler. |

---

## Design QA Checklist

- [ ] All states visually distinct
- [ ] Error messages are actionable and non-blaming
- [ ] Disabled states are clearly communicated
- [ ] Success/failure feedback is immediate
- [ ] Recipient address edge cases all handled

### Extended QA Notes

- [ ] Federation address input (`user*domain.com`) is rejected silently as an invalid format — consider a dedicated error message if federation support is planned
- [ ] Self-send is not blocked — confirm whether this is intentional or a missing guard
- [ ] Network existence check is absent — confirm product decision on whether to warn for valid-but-unknown addresses
- [ ] Confirm & Send has no loading/submitting state — spinner or disabled state needed before real submission is wired up
- [ ] Exchange rates are hardcoded — staleness indicator or refresh mechanism needed when live rates are integrated
- [ ] Split percentages are hardcoded — loading and error states needed when the split contract is integrated
- [ ] Emergency Transfer modal submit button has no real action — submission logic and async feedback needed
- [ ] Address Book button in `SendHeader` has no `onClick` handler — either wire it up or remove it until the feature ships
- [ ] `TransactionSuccessReceipt` uses a randomly generated fake hash — replace with real transaction hash when submission is implemented
