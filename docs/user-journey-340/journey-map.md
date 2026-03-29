# Journey Map – First Remittance to First Goal Funded

## Primary User Story
A first-time user lands on the product, sends their first remittance, understands how to split money intentionally, sees progress toward a financial goal, and completes or considers a bill payment within the same ecosystem.

---

## Journey 1: Entry to First Remittance
### Route
`/` → `/send`

### User Goal
Send money quickly and confidently.

### Touchpoints
- Landing page value proposition
- Primary CTA into send flow
- Recipient selection / amount entry
- Fees, rates, and confirmation details
- Success confirmation

### User Questions
- Is this safe?
- How much will the recipient get?
- What fees apply?
- How long will it take?

### Design Requirements
- Strong primary CTA
- Clear hierarchy for amount, recipient, fees, and exchange summary
- Trust cues and concise guidance
- Error prevention for invalid or incomplete input

### States
- Default
- Focus
- Validation error
- Loading
- Success
- Network/system error

---

## Journey 2: Remittance to Smart Split Setup
### Route
`/send` → `/split`

### User Goal
Decide how incoming or outgoing money should be allocated across needs.

### Touchpoints
- Prompt after successful remittance
- Suggested split presets
- Editable custom percentages/amounts
- Confirmation of allocation logic

### User Questions
- How should I divide this amount?
- Can I set savings before spending?
- Can I edit the split later?

### Design Requirements
- Guided setup with simple defaults
- Visual clarity between essentials, bills, savings, and discretionary buckets
- Real-time feedback for totals and invalid allocations

### States
- Default
- Active/editing
- Invalid total
- Saved successfully
- Empty/no split configured

---

## Journey 3: Split to First Goal Funded
### Route
`/split` → `/dashboard`

### User Goal
See that a goal has been funded for the first time and understand progress.

### Touchpoints
- Dashboard summary cards
- Goal progress module
- Funding confirmation
- Goal next-step suggestion

### User Questions
- Did money go into my goal?
- How much progress have I made?
- What should I do next?

### Design Requirements
- Celebrate first funded moment clearly
- Surface progress in a way that feels motivating, not overwhelming
- Keep supporting actions visible: add more, edit split, review activity

### States
- Goal created but unfunded
- First funded success state
- In-progress state
- Goal completed
- Empty state if no goal exists

### Note
There is no dedicated `/goals` route in the current app structure, so goal-funded visibility is mapped to `/dashboard` for this handoff.

---

## Journey 4: Goal Awareness to Bill Payment
### Route
`/dashboard` → `/bills`

### User Goal
Use the platform to stay on top of recurring obligations without losing visibility into goals and cash flow.

### Touchpoints
- Bill due reminders
- Bill category / provider selection
- Payment amount and due date display
- Confirmation and updated balance context

### User Questions
- What bill is due next?
- Will this affect my savings progress?
- Can I pay this now without confusion?

### Design Requirements
- Show due date and urgency clearly
- Make balance/source-of-funds understandable
- Prevent accidental payment mistakes
- Reinforce relationship between bills and budgeting goals

### States
- Upcoming due
- Overdue/urgent
- Payment in progress
- Payment success
- Payment failure

---

## Follow-up Visibility
### Routes
- `/transactions`
- `/dashboard`
- `/insights` or `/financial-insights`

### Purpose
Help users understand what happened after the key actions:
- Remittance completed
- Split saved
- Goal funded
- Bill paid

### Design Opportunity
Create a cohesive post-action feedback loop:
- transaction receipt/history
- updated dashboard totals
- recommended next step
- contextual financial insight