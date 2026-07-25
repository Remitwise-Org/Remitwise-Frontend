import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@/lib/i18n/client', () => ({
  useClientTranslator: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'quickActions.emergencyTransfer': 'Emergency Transfer',
        'quickActions.send': 'Send',
        'quickActions.split': 'Split',
        'quickActions.family': 'Family',
        'quickActions.goals': 'Goals',
        'quickActions.bills': 'Bills',
        'quickActions.urgentBadge': 'URGENT',
      }
      return translations[key] ?? key
    },
  }),
  useClientLocale: () => 'en-US',
}))

import QuickActions from '@/components/Dashboard/QuickActions'

afterEach(() => {
  cleanup()
})

describe('QuickActions', () => {
  const expectedActions = [
    { key: 'emergencyTransfer', name: 'Emergency Transfer', href: '/emergency-transfer', variant: 'primary', priority: 'high' },
    { key: 'send', name: 'Send', href: '/send', variant: 'secondary', priority: 'normal' },
    { key: 'split', name: 'Split', href: '/split', variant: 'secondary', priority: 'normal' },
    { key: 'family', name: 'Family', href: '/family', variant: 'secondary', priority: 'normal' },
    { key: 'goals', name: 'Goals', href: '/dashboard/goals', variant: 'secondary', priority: 'normal' },
    { key: 'bills', name: 'Bills', href: '/bills', variant: 'secondary', priority: 'normal' },
  ]

  it('renders all actions with correct hrefs', () => {
    render(<QuickActions />)

    for (const action of expectedActions) {
      const link = screen.getByRole('link', { name: action.name })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', action.href)
    }
  })

  it('renders accessible aria-label on every action', () => {
    render(<QuickActions />)

    for (const action of expectedActions) {
      const link = screen.getByRole('link', { name: action.name })
      expect(link).toHaveAttribute('aria-label', action.name)
    }
  })

  it('renders the primary variant with red background emphasis', () => {
    render(<QuickActions />)

    const emergency = screen.getByRole('link', { name: 'Emergency Transfer' })
    expect(emergency.className).toContain('bg-red-600')
    expect(emergency.className).toContain('text-white')
  })

  it('renders secondary variant actions with slate styling', () => {
    render(<QuickActions />)

    for (const action of expectedActions) {
      if (action.variant !== 'secondary') continue
      const link = screen.getByRole('link', { name: action.name })
      expect(link.className).toContain('bg-slate-50')
      expect(link.className).toContain('text-slate-700')
    }
  })

  it('shows the URGENT badge only on the high-priority Emergency Transfer action', () => {
    render(<QuickActions />)

    const emergency = screen.getByRole('link', { name: 'Emergency Transfer' })
    expect(emergency).toHaveTextContent('URGENT')

    for (const action of expectedActions) {
      if (action.key === 'emergencyTransfer') continue
      const link = screen.getByRole('link', { name: action.name })
      expect(link).not.toHaveTextContent('URGENT')
    }
  })

  it('renders all links in logical DOM order matching the action definition', () => {
    render(<QuickActions />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(expectedActions.length)

    for (let i = 0; i < links.length; i++) {
      expect(links[i]).toHaveAttribute('href', expectedActions[i].href)
    }
  })

  it('renders all links focusable and allows tabbing through in order', async () => {
    render(<QuickActions />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(expectedActions.length)

    for (const link of links) {
      expect(link).not.toHaveAttribute('tabindex', '-1')
    }

    const user = userEvent.setup()
    for (let i = 0; i < links.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await user.tab()
      expect(document.activeElement).toBe(links[i])
    }
  })

  it('renders without throwing', () => {
    expect(() => render(<QuickActions />)).not.toThrow()
  })
})
