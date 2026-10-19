# Component and State Inventory

## Core Components

### Buttons
- Primary
- Secondary
- Ghost / tertiary
- Disabled
- Loading

### Inputs
- Amount input
- Recipient search/select
- Percentage / allocation input
- Bill amount input

States:
- Default
- Focus
- Filled
- Error
- Disabled

### Cards
- Remittance summary card
- Split bucket card
- Goal progress card
- Bill due card
- Transaction receipt card

States:
- Default
- Hover
- Selected
- Disabled
- Empty

### Navigation
- Top navigation
- Mobile bottom navigation or drawer if applicable
- Breadcrumb/back navigation for multi-step flows

### Feedback Components
- Toast/snackbar
- Inline validation
- Success confirmation
- Error banner
- Empty state illustration/content
- Loading skeleton/spinner

### Progress Components
- Stepper for send flow if multi-step
- Goal progress bar/ring
- Allocation visualization for split
- Bill due urgency indicator

## Critical Interaction States

### Send Flow
- Enter amount
- Invalid amount
- Recipient missing
- Review/confirm
- Sending/loading
- Success
- Failure

### Split Flow
- Suggested preset selected
- Custom allocation editing
- Total exceeds 100%
- Total below 100%
- Saved

### Goal Visibility
- No goal yet
- Goal created
- First goal funded
- Goal progress updated
- Goal complete

### Bills Flow
- No bills available
- Bill selected
- Payment pending
- Payment successful
- Payment failed
- Overdue emphasis

## Accessibility Notes
- Focus styles must always remain visible
- Touch targets should be large enough on mobile
- Error messages should be specific and attached to the relevant field
- Color should not be the only signal for status
- Disabled states must remain legible