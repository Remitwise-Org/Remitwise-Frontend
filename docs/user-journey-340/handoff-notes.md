# Design Handoff Notes

## Spacing
- Base spacing: 4px scale
- Common: p-4, p-6, gap-4

## Typography
- Headings: font-semibold
- Body: text-sm / text-base
- Labels: text-muted

## Buttons
- Primary: brand color
- Hover: darker shade
- Focus: visible ring
- Disabled: reduced opacity but readable

## Inputs
- Focus: ring outline
- Error: red border + message
- Disabled: muted background

## States

### Loading
- Spinner inside button
- Skeleton for cards

### Error
- Inline error messages
- Banner for system errors

### Success
- Confirmation screen
- Toast/snackbar

### Empty
- Friendly illustration + CTA

## Interaction Notes
- All interactive elements must have hover + focus states
- No hidden actions
- Clear CTA hierarchy

## Accessibility
- Keyboard navigation supported
- Focus always visible
- Contrast compliant (WCAG AA)