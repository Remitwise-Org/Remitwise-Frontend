import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    buildCreateGoalTx,
    buildAddToGoalTx,
    buildWithdrawFromGoalTx,
    buildLockGoalTx,
    buildUnlockGoalTx,
    getGoal,
    getAllGoals,
    isGoalCompleted,
    ContractReadError,
} from './savings-goals'
import * as StellarSdk from '@stellar/stellar-sdk'

const originalEnv = process.env
const readMocks = vi.hoisted(() => ({
    getContractData: vi.fn(),
    simulateTransaction: vi.fn(),
    getAccount: vi.fn(),
}))

vi.mock('@/lib/soroban/client', async () => {
    const Stellar = await import('@stellar/stellar-sdk')
    return {
        getServer: () => ({
            getContractData: readMocks.getContractData,
            simulateTransaction: readMocks.simulateTransaction,
            getAccount: readMocks.getAccount,
        }),
        getNetworkPassphrase: () => Stellar.Networks.TESTNET,
    }
})

// We need a specific key to simulate RPC failures without failing the Address constructor checksum
let rpcFailKey: string

beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID = StellarSdk.StrKey.encodeContract(Buffer.alloc(32))
    rpcFailKey = StellarSdk.Keypair.random().publicKey()
    readMocks.getAccount.mockImplementation(async (accountId: string) =>
        new StellarSdk.Account(accountId, '123')
    )
})

afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
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

    function mockContractDataEntry(scVal: StellarSdk.xdr.ScVal) {
        return {
            val: {
                contractData() {
                    return { val() { return scVal } }
                },
            },
        }
    }

    describe('savings-goals contract reads', () => {
        const mockGetContractData = readMocks.getContractData
        const mockSimulateTransaction = readMocks.simulateTransaction

        it('returns a goal and completed status from contract data', async () => {
            const rawData = {
                name: 'Emergency Fund',
                target_amount: 10000n,
                current_amount: 10000n,
                target_date: 1735689600n,
                locked: false,
            }
            mockGetContractData.mockResolvedValue(
                mockContractDataEntry(StellarSdk.nativeToScVal(rawData)) as any
            )

            const goal = await getGoal('goal-1')
            expect(goal).toMatchObject({
                id: 'goal-1',
                name: 'Emergency Fund',
                targetAmount: 10000,
                currentAmount: 10000,
                locked: false,
            })
            await expect(isGoalCompleted('goal-1')).resolves.toBe(true)
        })

        it('returns null and false when the goal does not exist', async () => {
            mockGetContractData.mockResolvedValue(null)
            await expect(getGoal('goal-999')).resolves.toBeNull()
            await expect(isGoalCompleted('goal-999')).resolves.toBe(false)
        })

        it('throws ContractReadError on RPC failures and retries once', async () => {
            const mockFn = vi.fn()
                .mockRejectedValueOnce(new Error('Transient error'))
                .mockResolvedValueOnce(null)
            mockGetContractData.mockImplementation(mockFn)

            await expect(getGoal('goal-1')).resolves.toBeNull()
            expect(mockFn).toHaveBeenCalledTimes(2)

            mockGetContractData.mockRejectedValue(new Error('RPC unreachable'))
            await expect(getGoal('goal-1')).rejects.toThrow(ContractReadError)
        })

        it('returns all goals from simulation', async () => {
            const retval = StellarSdk.nativeToScVal({
                'goal-1': {
                    name: 'Emergency Fund',
                    target_amount: 10000n,
                    current_amount: 5000n,
                    target_date: 1735689600n,
                    locked: false,
                },
            })
            mockSimulateTransaction.mockResolvedValue({ result: { retval } } as any)

            const goals = await getAllGoals('GA...owner')
            expect(goals).toEqual([
                expect.objectContaining({
                    id: 'goal-1',
                    name: 'Emergency Fund',
                    targetAmount: 10000,
                    currentAmount: 5000,
                }),
            ])
        })

        it('throws ContractReadError for invalid simulations', async () => {
            mockSimulateTransaction.mockResolvedValue({ error: 'simulation failed' } as any)
            await expect(getAllGoals('GA...owner')).rejects.toThrow(ContractReadError)

            mockSimulateTransaction.mockResolvedValue({ result: {} } as any)
            await expect(getAllGoals('GA...owner')).rejects.toThrow(ContractReadError)
        })
    })

    it('throws the resolver error if no savings contract ID is configured', async () => {
        delete process.env.NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID
        await expect(
            buildCreateGoalTx(validPublicKey, 'House', 10000, new Date().toISOString())
        ).rejects.toThrow(/Missing contract ID for SAVINGS_GOALS on (testnet|mainnet)/)
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
            readMocks.getAccount.mockRejectedValue(new Error('RPC Error'))
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
