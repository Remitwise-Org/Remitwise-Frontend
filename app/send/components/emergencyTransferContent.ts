export const EMERGENCY_TRANSFER_FEE_PERCENT = 2

export const EMERGENCY_TRANSFER_TITLE = 'Emergency transfer'

export const EMERGENCY_TRANSFER_BADGE = 'High priority'

export const EMERGENCY_TRANSFER_DESCRIPTION =
  'Send funds on the fastest path when timing matters more than your automatic split allocation.'

export const EMERGENCY_TRANSFER_WARNING =
  'This action adds a 2% priority fee, bypasses automatic split rules, and should only be used for urgent situations.'

export const EMERGENCY_TRANSFER_ACKNOWLEDGEMENT =
  'I understand the extra fee applies, automatic split rules are skipped, and this action should only be used for urgent transfers.'

export const EMERGENCY_TRANSFER_IMPACTS = [
  {
    label: 'Priority fee',
    value: '2% of transfer amount',
  },
  {
    label: 'Delivery path',
    value: 'Fastest available route',
  },
  {
    label: 'Split behavior',
    value: 'Automatic rules are bypassed',
  },
] as const
