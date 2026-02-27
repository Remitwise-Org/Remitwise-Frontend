import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    buildCreateGoalTx,
    buildAddToGoalTx,
    buildWithdrawFromGoalTx,
    buildLockGoalTx,
    buildUnlockGoalTx,
} from './savings-goals'
import * as StellarSdk from '@stellar/stellar-sdk'

const originalEnv = process.env

// We need a specific key to simulate RPC failures without failing the Address constructor checksum
let rpcFailKey: string

beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID = StellarSdk.StrKey.encodeContract(Buffer.alloc(32))
    rpcFailKey = StellarSdk.Keypair.random().publicKey()
})

afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
})

vi.spyOn(StellarSdk.SorobanRpc.Server.prototype, 'getAccount').mockImplementation(async (accountId: string) => {
    if (accountId === rpcFailKey) {
        throw new Error('RPC Error')
    }
    return new StellarSdk.Account(accountId, '123') as any
})

vi.spyOn(StellarSdk.Contract.prototype, 'call').mockImplementation(() => {
    return StellarSdk.Operation.manageData({ name: 'mock', value: 'mock' })
})

describe('savings-goals helper', () => {
    let validPublicKey: string

    beforeEach(() => {
        validPublicKey = StellarSdk.Keypair.random().publicKey()
    })

    it('throws error if NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID is missing', async () => {
        delete process.env.NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID
        await expect(
            buildCreateGoalTx(validPublicKey, 'House', 10000, new Date().toISOString())
        ).rejects.toThrow('NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID is not configured')
    })

    describe('buildCreateGoalTx', () => {
        it('returns a valid XDR for creating a goal', async () => {
            const xdrResult = await buildCreateGoalTx(
                validPublicKey,
                'House',
                10000,
                new Date(Date.now() + 86400000).toISOString()
            )
            expect(typeof xdrResult.xdr).toBe('string')
            expect(xdrResult.xdr.length).toBeGreaterThan(0)
        })
    })

    describe('buildAddToGoalTx', () => {
        it('returns a valid XDR for adding to goal', async () => {
            const xdrResult = await buildAddToGoalTx(validPublicKey, 'goal-123', 500)
            expect(typeof xdrResult.xdr).toBe('string')
        })
    })

    describe('buildWithdrawFromGoalTx', () => {
        it('returns a valid XDR for withdrawing from goal', async () => {
            const xdrResult = await buildWithdrawFromGoalTx(validPublicKey, 'goal-123', 500)
            expect(typeof xdrResult.xdr).toBe('string')
        })
    })

    describe('buildLockGoalTx', () => {
        it('returns a valid XDR for locking a goal', async () => {
            const xdrResult = await buildLockGoalTx(validPublicKey, 'goal-123')
            expect(typeof xdrResult.xdr).toBe('string')
        })
    })

    describe('buildUnlockGoalTx', () => {
        it('returns a valid XDR for unlocking a goal', async () => {
            const xdrResult = await buildUnlockGoalTx(validPublicKey, 'goal-123')
            expect(typeof xdrResult.xdr).toBe('string')
        })
    })

    describe('fallback account generation', () => {
        it('catches getAccount error and falls back to sequence 0 account', async () => {
            const xdrResult = await buildCreateGoalTx(
                rpcFailKey,
                'House',
                10000,
                new Date(Date.now() + 86400000).toISOString()
            )
            expect(typeof xdrResult.xdr).toBe('string')

            const tx = new StellarSdk.Transaction(xdrResult.xdr, StellarSdk.Networks.TESTNET)
            expect(tx.sequence).toBe('1')
        })
    })
})
