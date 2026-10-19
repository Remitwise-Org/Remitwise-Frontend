import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    buildCreatePolicyTx,
    buildPayPremiumTx,
    buildDeactivatePolicyTx,
} from './insurance'
import * as StellarSdk from '@stellar/stellar-sdk'

vi.spyOn(StellarSdk.Horizon.Server.prototype, 'loadAccount').mockImplementation(async (accountId: string) => {
    if (accountId.startsWith('G')) {
        return { sequence: '123' } as any
    }
    throw new Error('invalid-account')
})

describe('insurance helper', () => {
    let validPublicKey: string

    beforeEach(() => {
        vi.clearAllMocks()
        validPublicKey = StellarSdk.Keypair.random().publicKey()
    })

    describe('buildCreatePolicyTx', () => {
        it('returns a valid XDR for creating a policy', async () => {
            const owner = validPublicKey
            const name = 'Health Insurance'
            const coverageType = 'Medical'
            const monthlyPremium = 100
            const coverageAmount = 50000

            const xdr = await buildCreatePolicyTx(owner, name, coverageType, monthlyPremium, coverageAmount)
            expect(typeof xdr).toBe('string')
            expect(xdr.length).toBeGreaterThan(0)

            const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET)
            expect(tx.operations).toHaveLength(4)
        })

        it('throws error for invalid owner public key', async () => {
            await expect(
                buildCreatePolicyTx('invalid-key', 'Health', 'Medical', 100, 5000)
            ).rejects.toThrow('invalid-owner')
        })

        it('throws error for invalid name', async () => {
            await expect(
                buildCreatePolicyTx(validPublicKey, '', 'Medical', 100, 5000)
            ).rejects.toThrow('invalid-name')
        })

        it('throws error for invalid coverage type', async () => {
            await expect(
                buildCreatePolicyTx(validPublicKey, 'Health', '', 100, 5000)
            ).rejects.toThrow('invalid-coverageType')
        })

        it('throws error for invalid premium', async () => {
            await expect(
                buildCreatePolicyTx(validPublicKey, 'Health', 'Medical', -10, 5000)
            ).rejects.toThrow('invalid-monthlyPremium')
        })

        it('throws error for invalid coverage amount', async () => {
            await expect(
                buildCreatePolicyTx(validPublicKey, 'Health', 'Medical', 100, -5000)
            ).rejects.toThrow('invalid-coverageAmount')
        })
    })

    describe('buildPayPremiumTx', () => {
        it('returns a valid XDR for paying a premium', async () => {
            const xdr = await buildPayPremiumTx(validPublicKey, 'policy-123')
            expect(typeof xdr).toBe('string')
            const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET)
            expect(tx.operations).toHaveLength(1)
        })

        it('throws error for invalid caller', async () => {
            await expect(buildPayPremiumTx('invalid', 'policy-123')).rejects.toThrow('invalid-caller')
        })

        it('throws error for missing policyId', async () => {
            await expect(buildPayPremiumTx(validPublicKey, '')).rejects.toThrow('invalid-policyId')
        })
    })

    describe('buildDeactivatePolicyTx', () => {
        it('returns a valid XDR for deactivating a policy', async () => {
            const xdr = await buildDeactivatePolicyTx(validPublicKey, 'policy-456')
            expect(typeof xdr).toBe('string')
            const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET)
            expect(tx.operations).toHaveLength(1)
        })

        it('throws error for invalid caller', async () => {
            await expect(buildDeactivatePolicyTx('invalid', 'policy-123')).rejects.toThrow('invalid-caller')
        })

        it('throws error for missing policyId', async () => {
            await expect(buildDeactivatePolicyTx(validPublicKey, '')).rejects.toThrow('invalid-policyId')
        })
    })
})
