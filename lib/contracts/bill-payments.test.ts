import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    buildCreateBillTx,
    buildPayBillTx,
    buildCancelBillTx,
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
        validPublicKey = StellarSdk.Keypair.random().publicKey()
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
})
