import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'

const refetchQueries = vi.fn()

vi.mock('@tanstack/react-query', () => {
  return {
    useQueryClient: () => ({
      refetchQueries
    })
  }
})

vi.mock('@/lib/i18n/client', () => ({
  useClientTranslator: () => ({
    t: (key: string) => {
      if (key === 'quickRefresh.label') return 'Quick Refresh'
      if (key === 'quickRefresh.button') return 'Refresh'
      return key
    },
  }),
}))

import QuickRefreshButton from '@/components/QuickRefreshButton'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('QuickRefreshButton', () => {
  it('renders the refresh button', () => {
    render(<QuickRefreshButton />)
    const button = screen.getByRole('button', { name: 'Quick Refresh' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Refresh')
  })

  it('triggers refetch on all mounted queries when clicked', async () => {
    render(<QuickRefreshButton />)
    const button = screen.getByRole('button', { name: 'Quick Refresh' })
    
    const user = userEvent.setup()
    await user.click(button)
    
    expect(refetchQueries).toHaveBeenCalledTimes(1)
    expect(refetchQueries).toHaveBeenCalledWith({ type: 'active' })
  })
})
