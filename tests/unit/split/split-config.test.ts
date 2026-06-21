import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SPLIT_CONFIG,
  computeAllocation,
  type SplitConfig,
} from '../../../lib/remittance/split'
import {
  validatePercentages,
  ValidationError,
  type SplitPercentages,
} from '../../../lib/validation/percentages'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const valid100: SplitPercentages = { spending: 50, savings: 30, bills: 15, insurance: 5 }

function makePercentages(overrides: Partial<SplitPercentages> = {}): SplitPercentages {
  return { ...valid100, ...overrides }
}

// ---------------------------------------------------------------------------
// DEFAULT_SPLIT_CONFIG
// ---------------------------------------------------------------------------

describe('DEFAULT_SPLIT_CONFIG', () => {
  it('sums to exactly 100', () => {
    const { spending, savings, bills, insurance } = DEFAULT_SPLIT_CONFIG
    expect(spending + savings + bills + insurance).toBe(100)
  })

  it('has no negative values', () => {
    for (const v of Object.values(DEFAULT_SPLIT_CONFIG)) {
      expect(v).toBeGreaterThanOrEqual(0)
    }
  })

  it('matches the SplitConfig shape (spending, savings, bills, insurance)', () => {
    const keys = Object.keys(DEFAULT_SPLIT_CONFIG).sort()
    expect(keys).toEqual(['bills', 'insurance', 'savings', 'spending'])
  })
})

// ---------------------------------------------------------------------------
// validatePercentages — valid cases
// ---------------------------------------------------------------------------

describe('validatePercentages — valid input', () => {
  it('does not throw when percentages sum to exactly 100', () => {
    expect(() => validatePercentages(valid100)).not.toThrow()
  })

  it('does not throw for equal 25/25/25/25 split', () => {
    expect(() =>
      validatePercentages({ spending: 25, savings: 25, bills: 25, insurance: 25 })
    ).not.toThrow()
  })

  it('does not throw when one category takes the full 100', () => {
    expect(() =>
      validatePercentages({ spending: 100, savings: 0, bills: 0, insurance: 0 })
    ).not.toThrow()
  })

  it('accepts DEFAULT_SPLIT_CONFIG values', () => {
    expect(() => validatePercentages(DEFAULT_SPLIT_CONFIG as SplitPercentages)).not.toThrow()
  })

  it('tolerates tiny floating-point deviation (≤ 0.01)', () => {
    // 33.34 + 33.33 + 33.33 = 100.00 — common rounding scenario
    expect(() =>
      validatePercentages({ spending: 33.34, savings: 33.33, bills: 33.33, insurance: 0 })
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// validatePercentages — invalid: sum < 100
// ---------------------------------------------------------------------------

describe('validatePercentages — sum under 100', () => {
  it('throws ValidationError when total is under 100', () => {
    expect(() => validatePercentages(makePercentages({ spending: 0 }))).toThrow(ValidationError)
  })

  it('thrown message references the actual sum', () => {
    // total = 0+30+15+5 = 50
    try {
      validatePercentages(makePercentages({ spending: 0 }))
      expect.fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError)
      expect((e as ValidationError).message).toMatch(/50/)
    }
  })

  it('throws when all values are zero', () => {
    expect(() =>
      validatePercentages({ spending: 0, savings: 0, bills: 0, insurance: 0 })
    ).toThrow(ValidationError)
  })
})

// ---------------------------------------------------------------------------
// validatePercentages — invalid: sum > 100
// ---------------------------------------------------------------------------

describe('validatePercentages — sum over 100', () => {
  it('throws ValidationError when total exceeds 100', () => {
    expect(() => validatePercentages(makePercentages({ spending: 60 }))).toThrow(ValidationError)
  })

  it('thrown message references the actual sum', () => {
    // total = 60+30+15+5 = 110
    try {
      validatePercentages(makePercentages({ spending: 60 }))
      expect.fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError)
      expect((e as ValidationError).message).toMatch(/110/)
    }
  })
})

// ---------------------------------------------------------------------------
// validatePercentages — invalid: negative values
// ---------------------------------------------------------------------------

describe('validatePercentages — negative values', () => {
  it('throws ValidationError for negative spending', () => {
    expect(() => validatePercentages(makePercentages({ spending: -5 }))).toThrow(ValidationError)
  })

  it('throws ValidationError for negative savings', () => {
    expect(() => validatePercentages(makePercentages({ savings: -1 }))).toThrow(ValidationError)
  })

  it('thrown error name is "ValidationError"', () => {
    try {
      validatePercentages(makePercentages({ spending: -10 }))
      expect.fail('expected throw')
    } catch (e) {
      expect((e as ValidationError).name).toBe('ValidationError')
    }
  })
})

// ---------------------------------------------------------------------------
// computeAllocation — gating on valid split config
// ---------------------------------------------------------------------------

describe('computeAllocation', () => {
  it('returns amounts that sum to the input amount', () => {
    const { spending, savings, bills, insurance } = computeAllocation(1000)
    expect(spending + savings + bills + insurance).toBe(1000)
  })

  it('distributes according to DEFAULT_SPLIT_CONFIG proportions', () => {
    const result = computeAllocation(200, { spending: 50, savings: 25, bills: 25, insurance: 0 })
    expect(result.spending).toBe(100)
    expect(result.savings).toBe(50)
    expect(result.bills).toBe(50)
    expect(result.insurance).toBe(0)
  })

  it('throws when config does not sum to 100', () => {
    const badConfig: SplitConfig = { spending: 10, savings: 10, bills: 10, insurance: 10 }
    expect(() => computeAllocation(100, badConfig)).toThrow()
  })

  it('handles zero amount gracefully (all allocations are 0)', () => {
    const result = computeAllocation(0)
    expect(result.spending + result.savings + result.bills + result.insurance).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Submit-button gating invariant (pure logic mirror of the page component)
// ---------------------------------------------------------------------------

describe('submit button gating logic', () => {
  function isSubmitEnabled(alloc: SplitPercentages, pending = false): boolean {
    try {
      validatePercentages(alloc)
      return !pending
    } catch {
      return false
    }
  }

  it('is enabled when total is 100 and not pending', () => {
    expect(isSubmitEnabled(valid100)).toBe(true)
  })

  it('is disabled when total is under 100', () => {
    expect(isSubmitEnabled(makePercentages({ spending: 0 }))).toBe(false)
  })

  it('is disabled when total is over 100', () => {
    expect(isSubmitEnabled(makePercentages({ spending: 80 }))).toBe(false)
  })

  it('is disabled when valid but pending', () => {
    expect(isSubmitEnabled(valid100, true)).toBe(false)
  })

  it('remains disabled across all invalid combinations', () => {
    const cases: SplitPercentages[] = [
      { spending: 0, savings: 0, bills: 0, insurance: 0 },
      { spending: 100, savings: 1, bills: 0, insurance: 0 },
      { spending: -1, savings: 50, bills: 25, insurance: 26 },
    ]
    for (const c of cases) {
      expect(isSubmitEnabled(c)).toBe(false)
    }
  })
})
