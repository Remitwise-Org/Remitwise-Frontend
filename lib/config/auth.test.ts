import { describe, it, expect, vi, beforeEach } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.resetModules()
  process.env = { ...ORIGINAL_ENV }
})

describe('AUTH_CONFIG', () => {
  it('uses the default URL when AUTH_ISSUER is not set', async () => {
    delete process.env.AUTH_ISSUER
    const { AUTH_CONFIG } = await import('@/lib/config/auth')
    expect(AUTH_CONFIG.issuer).toBe('http://localhost:3000')
  })

  it('reads AUTH_ISSUER from the environment when set', async () => {
    process.env.AUTH_ISSUER = 'https://auth.remitwise.com'
    const { AUTH_CONFIG } = await import('@/lib/config/auth')
    expect(AUTH_CONFIG.issuer).toBe('https://auth.remitwise.com')
  })
})
