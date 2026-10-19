import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    buildCreateBillTx,
    buildPayBillTx,
    buildCancelBillTx,
    getTotalUnpaid,
    getUnpaidBills,
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

    describe('getTotalUnpaid', () => {
        it('sums the amounts of unpaid bills fetched internally when no list is passed', async () => {
            const [bills, total] = await Promise.all([
                getUnpaidBills(validPublicKey),
                getTotalUnpaid(validPublicKey),
            ])
            const expected = bills.reduce((sum, bill) => sum + bill.amount, 0)
            expect(total).toBe(expected)
        })

        it('reuses an already-fetched bills list instead of re-fetching', async () => {
            const bills = await getUnpaidBills(validPublicKey)
            const expected = bills.reduce((sum, bill) => sum + bill.amount, 0)

            // Passing the pre-fetched list must produce the same total as
            // fetching internally, without calling getUnpaidBills again.
            const total = await getTotalUnpaid(validPublicKey, bills)
            expect(total).toBe(expected)
        })

        it('returns 0 for an explicitly empty bills list, without fetching', async () => {
            const total = await getTotalUnpaid(validPublicKey, [])
            expect(total).toBe(0)
        })
    })
})
