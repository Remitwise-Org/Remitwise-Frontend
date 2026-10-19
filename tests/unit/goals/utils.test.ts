import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateDaysLeft, checkIsOverdue } from '@/app/dashboard/goals/utils'

describe('Goals Utilities', () => {
  beforeEach(() => {
    // Mock today's date to Wednesday, June 17, 2026
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('calculateDaysLeft', () => {
    it('should calculate days left for a future date', () => {
      // June 20, 2026 is 3 days after June 17
      expect(calculateDaysLeft('2026-06-20')).toBe(3)
    })

    it('should return 0 for today', () => {
      expect(calculateDaysLeft('2026-06-17')).toBe(0)
    })

    it('should return 0 for a past date', () => {
      expect(calculateDaysLeft('2026-06-10')).toBe(0)
    })

    it('should handle end of year', () => {
      // June 17, 2026 to Dec 31, 2026
      // June: 13, July: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31
      // Total: 13+31+31+30+31+30+31 = 197
      expect(calculateDaysLeft('2026-12-31')).toBe(197)
    })
  })

  describe('checkIsOverdue', () => {
    it('should return false for a future date', () => {
      expect(checkIsOverdue('2026-06-20')).toBe(false)
    })

    it('should return false for today', () => {
      expect(checkIsOverdue('2026-06-17')).toBe(false)
    })

    it('should return true for a past date', () => {
      expect(checkIsOverdue('2026-06-10')).toBe(true)
    })
  })
})
