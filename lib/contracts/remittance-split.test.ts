import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    getSplit,
    getConfig,
    buildInitializeSplitTx
} from './remittance-split'
import * as StellarSdk from '@stellar/stellar-sdk'

const originalEnv = process.env

// We need a specific key to simulate RPC timeout
let rpcTimeoutKey: string

beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_SPLIT_CONTRACT_ID = StellarSdk.StrKey.encodeContract(Buffer.alloc(32))
    rpcTimeoutKey = StellarSdk.Keypair.random().publicKey()
})

afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
})

vi.spyOn(StellarSdk.SorobanRpc.Server.prototype, 'getAccount').mockImplementation(async (accountId: string) => {
    if (accountId === rpcTimeoutKey) {
        throw new Error('timeout')
    }
    return new StellarSdk.Account(accountId, '123') as any
})

vi.spyOn(StellarSdk.Contract.prototype, 'call').mockImplementation(() => {
    return StellarSdk.Operation.manageData({ name: 'mock', value: 'mock' })
})

describe('remittance-split helper', () => {
    let validPublicKey: string

    beforeEach(() => {
        validPublicKey = StellarSdk.Keypair.random().publicKey()
    })

    it('throws error if contract not found', async () => {
        delete process.env.NEXT_PUBLIC_SPLIT_CONTRACT_ID
        await expect(
            getSplit(validPublicKey)
        ).rejects.toThrow('contract not found')
    })

    describe('getSplit', () => {
        it('returns expected shape when RPC returns X', async () => {
            const split = await getSplit(validPublicKey)
            expect(split).toEqual({
                spending: 50,
                savings: 30,
                bills: 15,
                insurance: 5
            })
        })

        it('throws RPC timeout', async () => {
            await expect(getSplit(rpcTimeoutKey)).rejects.toThrow('RPC timeout')
        })
    })

    describe('getConfig', () => {
        it('returns null when not initialized', async () => {
            const config = await getConfig(validPublicKey)
            expect(config).toBeNull()
        })

        it('throws RPC timeout', async () => {
            await expect(getConfig(rpcTimeoutKey)).rejects.toThrow('RPC timeout')
        })
    })

    describe('buildInitializeSplitTx', () => {
        it('builds valid structure', async () => {
            const xdr = await buildInitializeSplitTx(validPublicKey, 50, 30, 15, 5)
            expect(typeof xdr).toBe('string')
            expect(xdr.length).toBeGreaterThan(0)
        })

        it('throws error if split does not equal 100', async () => {
            await expect(
                buildInitializeSplitTx(validPublicKey, 10, 10, 10, 10)
            ).rejects.toThrow('Split must equal 100')
        })

        it('throws RPC timeout on build', async () => {
            await expect(
                buildInitializeSplitTx(rpcTimeoutKey, 50, 30, 15, 5)
            ).rejects.toThrow('RPC timeout')
        })
    })
})
