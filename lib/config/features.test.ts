import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  getActiveFlagsForRoute,
  type FeatureFlagDefinition,
} from '@/lib/config/features'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.restoreAllMocks()
  process.env = { ...ORIGINAL_ENV }
})

describe('FEATURE_FLAGS', () => {
  it('defines at least one flag', () => {
    expect(FEATURE_FLAGS.length).toBeGreaterThan(0)
  })

  it('each flag has all required fields', () => {
    for (const flag of FEATURE_FLAGS) {
      expect(flag.key).toBeTruthy()
      expect(flag.label).toBeTruthy()
      expect(flag.description).toBeTruthy()
      expect(Array.isArray(flag.routes)).toBe(true)
      expect(flag.routes.length).toBeGreaterThan(0)
      expect(flag.envVar).toMatch(/^NEXT_PUBLIC_/)
    }
  })

  it('each flag has a unique key', () => {
    const keys = FEATURE_FLAGS.map((f) => f.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('SESSION_REFRESH gates dashboard and send routes', () => {
    const sr = FEATURE_FLAGS.find((f) => f.key === 'SESSION_REFRESH')
    expect(sr).toBeDefined()
    expect(sr!.routes).toContain('/dashboard')
    expect(sr!.routes).toContain('/send')
  })
})

describe('isFeatureEnabled', () => {
  const flag: FeatureFlagDefinition = {
    key: 'TEST_FLAG',
    label: 'Test Flag',
    description: 'A test flag',
    routes: ['/test'],
    envVar: 'NEXT_PUBLIC_TEST_FLAG_ENABLED',
  }

  it('returns true when env var is exactly "true"', () => {
    process.env.NEXT_PUBLIC_TEST_FLAG_ENABLED = 'true'
    expect(isFeatureEnabled(flag)).toBe(true)
  })

  it('returns false when env var is "false"', () => {
    process.env.NEXT_PUBLIC_TEST_FLAG_ENABLED = 'false'
    expect(isFeatureEnabled(flag)).toBe(false)
  })

  it('returns false when env var is absent', () => {
    delete process.env.NEXT_PUBLIC_TEST_FLAG_ENABLED
    expect(isFeatureEnabled(flag)).toBe(false)
  })

  it('returns false when env var is an arbitrary string', () => {
    process.env.NEXT_PUBLIC_TEST_FLAG_ENABLED = '1'
    expect(isFeatureEnabled(flag)).toBe(false)
  })
})

describe('getActiveFlagsForRoute', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED = 'true'
  })

  it('returns the flag when pathname matches a route exactly', () => {
    const result = getActiveFlagsForRoute('/dashboard')
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.some((f) => f.key === 'SESSION_REFRESH')).toBe(true)
  })

  it('matches sub-routes of the gated prefix', () => {
    const result = getActiveFlagsForRoute('/dashboard/settings')
    expect(result.some((f) => f.key === 'SESSION_REFRESH')).toBe(true)
  })

  it('returns empty array when pathname does not match', () => {
    const result = getActiveFlagsForRoute('/settings')
    expect(result.some((f) => f.key === 'SESSION_REFRESH')).toBe(false)
  })

  it('returns empty array when flag is not enabled', () => {
    process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED = 'false'
    const result = getActiveFlagsForRoute('/dashboard')
    expect(result.some((f) => f.key === 'SESSION_REFRESH')).toBe(false)
  })
})