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

  it('applies sticky classes on tall screens', () => {
    render(
      <PageHeader
        title="Bills"
        subtitle="Manage your bills"
        ctaLabel="Add Bill"
      />
    )

    const headerElement = screen.getByRole('banner')
    expect(headerElement).toHaveClass('tall:sticky')
    expect(headerElement).toHaveClass('tall:top-16')
    expect(headerElement).toHaveClass('375:tall:top-20')
    expect(headerElement).toHaveClass('tall:z-40')
  })
})
