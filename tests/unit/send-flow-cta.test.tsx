// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import AmountCurrencySection from '@/app/send/components/AmountCurrencySection'
import RecipientAddressInput from '@/app/send/components/RecipientAddressInput'
import ReviewStep from '@/app/send/components/ReviewStep'
import { CTA_TEST_IDS } from '@/lib/cta-testids'

vi.mock('@/lib/context/RatesContext', () => ({
  useExchangeRates: () => ({
    rates: [],
    loading: false,
    stale: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

vi.mock('@/lib/i18n/client', () => ({
  useClientTranslator: () => ({
    t: (key: string) => key,
  }),
  useClientLocale: () => 'en-US',
}))

describe('send flow primary CTAs', () => {
  it('renders stable test ids for each primary send step CTA', () => {
    const { unmount } = render(
      <RecipientAddressInput initialAddress="GAFAMILYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
    )
    expect(screen.getByTestId(CTA_TEST_IDS.flow.sendRecipientPrimary)).toBeInTheDocument()

    unmount()
    render(<AmountCurrencySection />)
    expect(screen.getByTestId(CTA_TEST_IDS.flow.sendAmountPrimary)).toBeInTheDocument()

    render(
      <ReviewStep
        recipient="GAFAMILYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        amount={100}
        currency="USDC"
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onEmergencyAction={vi.fn()}
      />
    )
    expect(screen.getByTestId(CTA_TEST_IDS.flow.sendReviewPrimary)).toBeInTheDocument()
  })
})
