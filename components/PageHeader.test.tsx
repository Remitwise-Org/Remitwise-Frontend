import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PageHeader from '@/components/PageHeader'
import { CTA_TEST_IDS } from '@/lib/cta-testids'

const back = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back,
  }),
}))

describe('PageHeader', () => {
  beforeEach(() => {
    back.mockReset()
  })

  it('renders the configured CTA test id', () => {
    render(
      <PageHeader
        title="Bills"
        subtitle="Manage your bills"
        ctaLabel="Add Bill"
        ctaTestId={CTA_TEST_IDS.page.billsPrimary}
      />
    )

    expect(screen.getByTestId(CTA_TEST_IDS.page.billsPrimary)).toHaveTextContent('Add Bill')
  })

  it('keeps the back button working', () => {
    render(
      <PageHeader
        title="Bills"
        subtitle="Manage your bills"
        ctaLabel="Add Bill"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /go back/i }))
    expect(back).toHaveBeenCalledTimes(1)
  })
})
