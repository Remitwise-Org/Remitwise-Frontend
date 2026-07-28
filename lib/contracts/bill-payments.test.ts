import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    buildCreateBillTx,
    buildPayBillTx,
    buildCancelBillTx,
    validateDueDateNotPast,
    nextDueDateFromNow,
} from './bill-payments'
import * as StellarSdk from '@stellar/stellar-sdk'

vi.spyOn(StellarSdk.Horizon.Server.prototype, 'loadAccount').mockImplementation(async (accountId: string) => {
    if (accountId.startsWith('G')) {
        return { sequence: '123' } as any
    }
    throw new Error('invalid-account')
})

describe('bill-payments helper', () => {
    let validPublicKey: string

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        // Fixed "now": 2026-07-27T12:00:00.000Z
        vi.setSystemTime(new Date('2026-07-27T12:00:00.000Z'))
        validPublicKey = StellarSdk.Keypair.random().publicKey()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('buildCreateBillTx', () => {
        it('returns a valid XDR for a one-time bill', async () => {
            const owner = validPublicKey
            const name = 'Electric Bill'
            const amount = 50
            const dueDate = new Date(Date.now() + 86400000).toISOString() // tomorrow
            const recurring = false

            const xdr = await buildCreateBillTx(owner, name, amount, dueDate, recurring)
            expect(typeof xdr).toBe('string')
            expect(xdr.length).toBeGreaterThan(0)

            const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET)
            expect(tx.operations).toHaveLength(4)
        })

        it('returns a valid XDR for a recurring bill', async () => {
            const owner = validPublicKey
            const name = 'Internet Bill'
            const amount = 80
            const dueDate = new Date(Date.now() + 86400000).toISOString()
            const recurring = true
            const frequencyDays = 30

            const xdr = await buildCreateBillTx(owner, name, amount, dueDate, recurring, frequencyDays)
            expect(typeof xdr).toBe('string')

            const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET)
            expect(tx.operations).toHaveLength(5)
        })

        it('throws error for invalid owner public key', async () => {
            await expect(
                buildCreateBillTx('invalid-key', 'Bill', 50, new Date().toISOString(), false)
            ).rejects.toThrow('invalid-owner')
        })

        it('throws error for invalid amount', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Bill', -10, new Date().toISOString(), false)
            ).rejects.toThrow('invalid-amount')
        })

        it('throws error for invalid frequency', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Bill', 50, new Date().toISOString(), true, -5)
            ).rejects.toThrow('invalid-frequency')
        })

        it('throws error for invalid due date', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Bill', 50, 'not-a-date', false)
            ).rejects.toThrow('invalid-dueDate')
        })
    })

    // ─── Due-date validation: validateDueDateNotPast ──────────────────────────

    describe('validateDueDateNotPast', () => {
        // Case 1: numeric zero string — parses to epoch 1970, must be rejected
        it('rejects the string "0" (Unix epoch zero)', () => {
            expect(() => validateDueDateNotPast('0')).toThrow('dueDate-in-past')
        })

        // Case 2: explicit epoch ISO string
        it('rejects "1970-01-01T00:00:00.000Z" (epoch zero as ISO)', () => {
            expect(() => validateDueDateNotPast('1970-01-01T00:00:00.000Z')).toThrow('dueDate-in-past')
        })

        // Case 3: a date that is clearly in the past
        it('rejects a date 30 days in the past', () => {
            const past = new Date(Date.now() - 30 * 86_400_000).toISOString()
            expect(() => validateDueDateNotPast(past)).toThrow('dueDate-in-past')
        })

        // Case 4: exactly now (same millisecond) — must be rejected (not strictly future)
        it('rejects a timestamp equal to now (not strictly future)', () => {
            const exactlyNow = new Date(Date.now()).toISOString()
            expect(() => validateDueDateNotPast(exactlyNow)).toThrow('dueDate-in-past')
        })

        // Case 5: one millisecond ago — must be rejected
        it('rejects a timestamp 1 ms in the past', () => {
            const oneMillisecondAgo = new Date(Date.now() - 1).toISOString()
            expect(() => validateDueDateNotPast(oneMillisecondAgo)).toThrow('dueDate-in-past')
        })

        // Case 6: one millisecond ahead — must be accepted
        it('accepts a timestamp 1 ms in the future', () => {
            const oneMillisecondAhead = new Date(Date.now() + 1).toISOString()
            expect(() => validateDueDateNotPast(oneMillisecondAhead)).not.toThrow()
        })

        // Case 7: a clearly future date
        it('accepts a date 7 days in the future', () => {
            const future = new Date(Date.now() + 7 * 86_400_000).toISOString()
            expect(() => validateDueDateNotPast(future)).not.toThrow()
        })

        // Case 8: completely non-parseable string → invalid-dueDate (not dueDate-in-past)
        it('throws invalid-dueDate for a non-parseable string', () => {
            expect(() => validateDueDateNotPast('not-a-date')).toThrow('invalid-dueDate')
        })

        // Case 9: empty string → invalid-dueDate
        it('throws invalid-dueDate for an empty string', () => {
            expect(() => validateDueDateNotPast('')).toThrow('invalid-dueDate')
        })
    })

    // ─── buildCreateBillTx rejects past due-dates end-to-end ─────────────────

    describe('buildCreateBillTx — past-date rejection', () => {
        it('rejects a bill with dueDate == "0"', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Rent', 100, '0', false)
            ).rejects.toThrow('dueDate-in-past')
        })

        it('rejects a bill with a past ISO due date', async () => {
            const yesterday = new Date(Date.now() - 86_400_000).toISOString()
            await expect(
                buildCreateBillTx(validPublicKey, 'Rent', 100, yesterday, false)
            ).rejects.toThrow('dueDate-in-past')
        })

        it('rejects a bill with dueDate exactly equal to now', async () => {
            const exactlyNow = new Date(Date.now()).toISOString()
            await expect(
                buildCreateBillTx(validPublicKey, 'Rent', 100, exactlyNow, false)
            ).rejects.toThrow('dueDate-in-past')
        })

        it('accepts a bill with dueDate strictly in the future', async () => {
            const tomorrow = new Date(Date.now() + 86_400_000).toISOString()
            await expect(
                buildCreateBillTx(validPublicKey, 'Rent', 100, tomorrow, false)
            ).resolves.toEqual(expect.any(String))
        })
    })

    // ─── nextDueDateFromNow — recurring bill generation safety ───────────────

    describe('nextDueDateFromNow', () => {
        it('returns a date strictly after now when base is in the past', () => {
            const yesterday = new Date(Date.now() - 86_400_000).toISOString()
            const next = nextDueDateFromNow(yesterday, 30)
            expect(Date.parse(next)).toBeGreaterThan(Date.now())
        })

        it('returns a date strictly after now when base is far in the past (many cycles)', () => {
            // base is 90 days ago, frequency is 7 days → must advance multiple times
            const farPast = new Date(Date.now() - 90 * 86_400_000).toISOString()
            const next = nextDueDateFromNow(farPast, 7)
            expect(Date.parse(next)).toBeGreaterThan(Date.now())
        })

        it('advances exactly one step when base is already in the future', () => {
            const inTwoDays = new Date(Date.now() + 2 * 86_400_000).toISOString()
            const next = nextDueDateFromNow(inTwoDays, 30)
            // The result should be base + 30 days (already > now, one step)
            const expected = Date.parse(inTwoDays) + 30 * 86_400_000
            expect(Date.parse(next)).toBe(expected)
        })

        it('the returned date always passes validateDueDateNotPast', () => {
            const pastBase = new Date(Date.now() - 5 * 86_400_000).toISOString()
            const next = nextDueDateFromNow(pastBase, 7)
            // Must not throw
            expect(() => validateDueDateNotPast(next)).not.toThrow()
        })

        it('throws invalid-dueDate for a non-parseable base date', () => {
            expect(() => nextDueDateFromNow('bad-date', 7)).toThrow('invalid-dueDate')
        })

        it('throws invalid-frequency for frequencyDays <= 0', () => {
            const future = new Date(Date.now() + 86_400_000).toISOString()
            expect(() => nextDueDateFromNow(future, 0)).toThrow('invalid-frequency')
            expect(() => nextDueDateFromNow(future, -1)).toThrow('invalid-frequency')
        })
    })

    describe('buildPayBillTx', () => {
        it('returns a valid XDR for paying a bill', async () => {
            const xdr = await buildPayBillTx(validPublicKey, 'bill-123')
            expect(typeof xdr).toBe('string')
            const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET)
            expect(tx.operations).toHaveLength(1)
        })

        it('throws error for invalid caller', async () => {
            await expect(buildPayBillTx('invalid', 'bill-123')).rejects.toThrow('invalid-caller')
        })

        it('throws error for missing billId', async () => {
            await expect(buildPayBillTx(validPublicKey, '')).rejects.toThrow('invalid-billId')
        })
    })

    describe('buildCancelBillTx', () => {
        it('returns a valid XDR for canceling a bill', async () => {
            const xdr = await buildCancelBillTx(validPublicKey, 'bill-456')
            expect(typeof xdr).toBe('string')
            const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET)
            expect(tx.operations).toHaveLength(1)
        })

        it('throws error for invalid caller', async () => {
            await expect(buildCancelBillTx('invalid', 'bill-123')).rejects.toThrow('invalid-caller')
        })

        it('throws error for missing billId', async () => {
            await expect(buildCancelBillTx(validPublicKey, '')).rejects.toThrow('invalid-billId')
        })
    })

    // ─── Edge-boundary due-date validation ───────────────────────────────────
    //
    // These tests cover calendar edge cases and boundary conditions that the
    // core suite does not yet exercise.  The fake clock is set to
    // 2026-07-27T12:00:00.000Z by beforeEach so all "past" / "future" labels
    // are relative to that fixed instant.

    describe('validateDueDateNotPast — edge boundaries', () => {
        // ── Leap year ──────────────────────────────────────────────────────────

        it('accepts a future leap-year date: 2028-02-29T00:00:00.000Z', () => {
            // 2028 is a leap year; Feb 29 is a valid calendar date and lies in
            // the future relative to the mocked "now" (2026-07-27).
            expect(() =>
                validateDueDateNotPast('2028-02-29T00:00:00.000Z')
            ).not.toThrow()
        })

        it('rejects a past leap-year date: 2024-02-29T00:00:00.000Z', () => {
            // 2024 was a leap year; Feb 29 2024 is in the past.
            expect(() =>
                validateDueDateNotPast('2024-02-29T00:00:00.000Z')
            ).toThrow('dueDate-in-past')
        })

        // ── Year boundary ─────────────────────────────────────────────────────

        it('accepts the upcoming year boundary: 2026-12-31T23:59:59.999Z', () => {
            expect(() =>
                validateDueDateNotPast('2026-12-31T23:59:59.999Z')
            ).not.toThrow()
        })

        it('accepts the next year start: 2027-01-01T00:00:00.000Z', () => {
            expect(() =>
                validateDueDateNotPast('2027-01-01T00:00:00.000Z')
            ).not.toThrow()
        })

        it('rejects a past year boundary: 2025-12-31T23:59:59.999Z', () => {
            expect(() =>
                validateDueDateNotPast('2025-12-31T23:59:59.999Z')
            ).toThrow('dueDate-in-past')
        })

        // ── DST transition dates ──────────────────────────────────────────────
        // ISO 8601 strings with explicit UTC offset bypass local DST
        // ambiguities; the validator must handle them without throwing
        // invalid-dueDate and must still enforce the past/future boundary.

        it('accepts a future DST spring-forward date expressed in UTC+1', () => {
            // Last Sunday in March 2027: 2027-03-28 02:00 → 03:00 in many TZs.
            // Expressed as UTC the date is unambiguous and in the future.
            expect(() =>
                validateDueDateNotPast('2027-03-28T01:00:00.000+00:00')
            ).not.toThrow()
        })

        it('accepts a future DST fall-back date expressed in UTC', () => {
            // Last Sunday in October 2026: 2026-10-25 in Europe.
            // Providing the UTC equivalent avoids host-TZ ambiguity.
            expect(() =>
                validateDueDateNotPast('2026-10-25T01:00:00.000Z')
            ).not.toThrow()
        })

        it('rejects a past DST date: 2026-03-29T01:00:00.000Z (already occurred)', () => {
            // March 29 2026 is before the fake "now" of 2026-07-27.
            expect(() =>
                validateDueDateNotPast('2026-03-29T01:00:00.000Z')
            ).toThrow('dueDate-in-past')
        })

        // ── Very large future timestamps ──────────────────────────────────────

        it('accepts a far-future date: 2099-12-31T23:59:59.999Z', () => {
            expect(() =>
                validateDueDateNotPast('2099-12-31T23:59:59.999Z')
            ).not.toThrow()
        })

        it('accepts the maximum safe Date value expressed as ISO string', () => {
            // Date.MAX_VALUE as timestamp is ~8.64e15 ms; use a representative
            // year safely within JS Date range.
            const maxSafeDate = new Date(8_640_000_000_000_000).toISOString()
            expect(() => validateDueDateNotPast(maxSafeDate)).not.toThrow()
        })

        // ── Whitespace / formatting quirks ────────────────────────────────────

        it('rejects a date string with only whitespace', () => {
            expect(() => validateDueDateNotPast('   ')).toThrow('invalid-dueDate')
        })

        it('rejects a partially valid date string: "2026-13-01"', () => {
            // Month 13 is invalid; Date.parse returns NaN for this on V8.
            expect(() => validateDueDateNotPast('2026-13-01')).toThrow('invalid-dueDate')
        })

        it('rejects a date-only string that evaluates to the past: "2026-01-01"', () => {
            // Date.parse("2026-01-01") → 2026-01-01T00:00:00.000Z which is
            // before the mocked now of 2026-07-27T12:00:00.000Z.
            expect(() => validateDueDateNotPast('2026-01-01')).toThrow('dueDate-in-past')
        })

        it('accepts a date-only string that evaluates to the future: "2026-12-01"', () => {
            expect(() => validateDueDateNotPast('2026-12-01')).not.toThrow()
        })
    })

    // ─── nextDueDateFromNow — additional edge cases ───────────────────────────

    describe('nextDueDateFromNow — edge boundaries', () => {
        // ── frequencyDays = 1 (minimum valid interval) ────────────────────────

        it('works correctly with frequencyDays = 1 (daily recurrence)', () => {
            const yesterday = new Date(Date.now() - 86_400_000).toISOString()
            const next = nextDueDateFromNow(yesterday, 1)
            // Result must be strictly after now.
            expect(Date.parse(next)).toBeGreaterThan(Date.now())
        })

        it('advances only one step when base + 1d is already future', () => {
            // Base is exactly 1 ms ago; adding 1 day lands well after now.
            const justPast = new Date(Date.now() - 1).toISOString()
            const next = nextDueDateFromNow(justPast, 1)
            const expected = Date.parse(justPast) + 86_400_000
            expect(Date.parse(next)).toBe(expected)
        })

        it('always produces a value that passes validateDueDateNotPast (daily, base far past)', () => {
            const farPast = new Date(Date.now() - 365 * 86_400_000).toISOString()
            const next = nextDueDateFromNow(farPast, 1)
            expect(() => validateDueDateNotPast(next)).not.toThrow()
        })

        // ── Large frequencyDays ───────────────────────────────────────────────

        it('handles frequencyDays = 365 (annual recurrence)', () => {
            const pastBase = new Date(Date.now() - 400 * 86_400_000).toISOString()
            const next = nextDueDateFromNow(pastBase, 365)
            expect(Date.parse(next)).toBeGreaterThan(Date.now())
            expect(() => validateDueDateNotPast(next)).not.toThrow()
        })

        // ── Base date exactly at now boundary ─────────────────────────────────

        it('returns base + frequencyDays when base is exactly now', () => {
            const exactlyNow = new Date(Date.now()).toISOString()
            const next = nextDueDateFromNow(exactlyNow, 7)
            const expected = Date.parse(exactlyNow) + 7 * 86_400_000
            expect(Date.parse(next)).toBe(expected)
            expect(Date.parse(next)).toBeGreaterThan(Date.now())
        })

        // ── Leap-year base date ───────────────────────────────────────────────

        it('handles a leap-day base date (2024-02-29) with 30-day frequency', () => {
            // 2024-02-29 is in the past; the function should still advance past now.
            const leapDay = '2024-02-29T00:00:00.000Z'
            const next = nextDueDateFromNow(leapDay, 30)
            expect(Date.parse(next)).toBeGreaterThan(Date.now())
            expect(() => validateDueDateNotPast(next)).not.toThrow()
        })

        // ── Return value is a valid ISO string ────────────────────────────────

        it('returns a parseable ISO string', () => {
            const past = new Date(Date.now() - 86_400_000).toISOString()
            const next = nextDueDateFromNow(past, 7)
            expect(typeof next).toBe('string')
            expect(isNaN(Date.parse(next))).toBe(false)
        })
    })

    // ─── buildCreateBillTx — edge-boundary due-date end-to-end ───────────────

    describe('buildCreateBillTx — edge-boundary due dates', () => {
        // ── Leap year future ──────────────────────────────────────────────────

        it('accepts a future leap-year due date (2028-02-29)', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Leap Bill', 100, '2028-02-29T00:00:00.000Z', false)
            ).resolves.toEqual(expect.any(String))
        })

        it('rejects a past leap-year due date (2024-02-29)', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Leap Bill', 100, '2024-02-29T00:00:00.000Z', false)
            ).rejects.toThrow('dueDate-in-past')
        })

        // ── Year boundary ─────────────────────────────────────────────────────

        it('accepts a due date at the upcoming year-end boundary: 2026-12-31T23:59:59.999Z', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Year-End Bill', 50, '2026-12-31T23:59:59.999Z', false)
            ).resolves.toEqual(expect.any(String))
        })

        it('rejects a due date at a past year boundary: 2025-12-31T23:59:59.999Z', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Old Year-End Bill', 50, '2025-12-31T23:59:59.999Z', false)
            ).rejects.toThrow('dueDate-in-past')
        })

        // ── Far future ────────────────────────────────────────────────────────

        it('accepts a far-future due date: 2099-12-31T23:59:59.999Z', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Far Future Bill', 200, '2099-12-31T23:59:59.999Z', false)
            ).resolves.toEqual(expect.any(String))
        })

        // ── Recurring bill with edge-boundary due date ────────────────────────

        it('accepts a recurring bill with a future leap-year due date', async () => {
            const xdr = await buildCreateBillTx(
                validPublicKey, 'Recurring Leap', 75,
                '2028-02-29T00:00:00.000Z',
                true, 365
            )
            const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET)
            // recurring bills carry 5 operations
            expect(tx.operations).toHaveLength(5)
        })

        // ── Numeric-zero due date via buildCreateBillTx ───────────────────────

        it('rejects dueDate "0" (numeric zero / epoch) via buildCreateBillTx', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Zero Bill', 50, '0', false)
            ).rejects.toThrow('dueDate-in-past')
        })

        // ── Non-parseable due date via buildCreateBillTx ──────────────────────

        it('rejects a completely non-parseable dueDate via buildCreateBillTx', async () => {
            await expect(
                buildCreateBillTx(validPublicKey, 'Bad Date Bill', 50, '$$invalid$$', false)
            ).rejects.toThrow('invalid-dueDate')
        })
    })
})
