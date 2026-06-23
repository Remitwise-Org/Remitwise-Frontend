import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as StellarSdk from '@stellar/stellar-sdk'
import { ContractReadError } from './dashboard-aggregate'

const mockGetContractData = vi.spyOn(
  StellarSdk.SorobanRpc.Server.prototype,
  'getContractData',
)
const mockSimulateTransaction = vi.spyOn(
  StellarSdk.SorobanRpc.Server.prototype,
  'simulateTransaction',
)

vi.spyOn(StellarSdk.Contract.prototype, 'call').mockImplementation(() => {
  return StellarSdk.Operation.manageData({ name: 'mock', value: 'mock' })
})

import { getGoal, getAllGoals, isGoalCompleted } from './savings-goal'

const originalEnv = process.env

function mockContractDataEntry(scVal: StellarSdk.xdr.ScVal) {
  return {
    val: {
      contractData() {
        return { val() { return scVal } }
      },
    },
  }
}

beforeEach(() => {
  vi.resetModules()
  process.env = { ...originalEnv }
  process.env.NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID =
    StellarSdk.StrKey.encodeContract(Buffer.alloc(32))
})

afterEach(() => {
  process.env = originalEnv
  vi.clearAllMocks()
})

describe('getGoal', () => {
  it('returns a SavingsGoal when contract data exists', async () => {
    const rawData = {
      name: 'Emergency Fund',
      target_amount: 10000n,
      current_amount: 5000n,
      target_date: 1735689600n,
      locked: false,
    }
    const scVal = StellarSdk.nativeToScVal(rawData)
    mockGetContractData.mockResolvedValue(mockContractDataEntry(scVal) as any)

    const goal = await getGoal('goal-1')

    expect(goal).not.toBeNull()
    expect(goal!.id).toBe('goal-1')
    expect(goal!.name).toBe('Emergency Fund')
    expect(goal!.targetAmount).toBe(10000)
    expect(goal!.currentAmount).toBe(5000)
    expect(goal!.targetDate).toBe(1735689600)
    expect(goal!.locked).toBe(false)
  })

  it('returns null when no contract data exists', async () => {
    mockGetContractData.mockResolvedValue(null)

    const goal = await getGoal('goal-999')
    expect(goal).toBeNull()
  })

  it('throws ContractReadError on RPC failure', async () => {
    mockGetContractData.mockRejectedValue(new Error('RPC unreachable'))

    await expect(getGoal('goal-1')).rejects.toThrow(ContractReadError)
  })

  it('throws ContractReadError on timeout', async () => {
    mockGetContractData.mockImplementation(
      () => new Promise<never>(() => {}),
    )

    await expect(getGoal('goal-1')).rejects.toThrow(ContractReadError)
  }, 25_000)

  it('retries once on transient RPC failure', async () => {
    const mockFn = vi.fn()
    mockFn
      .mockRejectedValueOnce(new Error('Transient error'))
      .mockResolvedValueOnce(null)

    mockGetContractData.mockImplementation(mockFn)

    const goal = await getGoal('goal-1')
    expect(goal).toBeNull()
    expect(mockFn).toHaveBeenCalledTimes(2)
  })
})

describe('getAllGoals', () => {
  it('returns goals when simulation succeeds with entries', async () => {
    const goalMap = {
      'goal-1': {
        name: 'Emergency Fund',
        target_amount: 10000n,
        current_amount: 5000n,
        target_date: 1735689600n,
        locked: false,
      },
      'goal-2': {
        name: 'Vacation Trip',
        target_amount: 5000n,
        current_amount: 1200n,
        target_date: 1767225600n,
        locked: true,
      },
    }
    const retval = StellarSdk.nativeToScVal(goalMap)
    mockSimulateTransaction.mockResolvedValue({
      result: { retval },
    } as any)

    const goals = await getAllGoals('GA...owner')

    expect(goals).toHaveLength(2)
    expect(goals[0].id).toBe('goal-1')
    expect(goals[0].name).toBe('Emergency Fund')
    expect(goals[0].targetAmount).toBe(10000)
    expect(goals[0].currentAmount).toBe(5000)
    expect(goals[0].locked).toBe(false)
    expect(goals[1].id).toBe('goal-2')
    expect(goals[1].name).toBe('Vacation Trip')
    expect(goals[1].locked).toBe(true)
  })

  it('returns empty array when simulation returns empty map', async () => {
    const retval = StellarSdk.nativeToScVal({})
    mockSimulateTransaction.mockResolvedValue({
      result: { retval },
    } as any)

    const goals = await getAllGoals('GA...owner')
    expect(goals).toEqual([])
  })

  it('throws ContractReadError when simulation error field is present', async () => {
    mockSimulateTransaction.mockResolvedValue({
      error: 'Contract error: resource limit exceeded',
    } as any)

    await expect(getAllGoals('GA...owner')).rejects.toThrow(ContractReadError)
  })

  it('throws ContractReadError when result is missing retval', async () => {
    mockSimulateTransaction.mockResolvedValue({
      result: {},
    } as any)

    await expect(getAllGoals('GA...owner')).rejects.toThrow(ContractReadError)
  })

  it('throws ContractReadError when result is null', async () => {
    mockSimulateTransaction.mockResolvedValue({
      result: null,
    } as any)

    await expect(getAllGoals('GA...owner')).rejects.toThrow(ContractReadError)
  })

  it('throws ContractReadError on malformed retval type', async () => {
    const retval = StellarSdk.nativeToScVal(42)
    mockSimulateTransaction.mockResolvedValue({
      result: { retval },
    } as any)

    await expect(getAllGoals('GA...owner')).rejects.toThrow(ContractReadError)
  })

  it('throws ContractReadError on RPC timeout', async () => {
    mockSimulateTransaction.mockImplementation(
      () => new Promise<never>(() => {}),
    )

    await expect(getAllGoals('GA...owner')).rejects.toThrow(ContractReadError)
  }, 25_000)

  it('retries once on transient simulation failure', async () => {
    const mockFn = vi.fn()
    mockFn
      .mockRejectedValueOnce(new Error('Transient error'))
      .mockResolvedValueOnce({
        result: { retval: StellarSdk.nativeToScVal({}) },
      } as any)

    mockSimulateTransaction.mockImplementation(mockFn)

    const goals = await getAllGoals('GA...owner')
    expect(goals).toEqual([])
    expect(mockFn).toHaveBeenCalledTimes(2)
  })
})

describe('isGoalCompleted', () => {
  it('returns true when currentAmount >= targetAmount', async () => {
    const rawData = {
      name: 'Fund',
      target_amount: 10000n,
      current_amount: 10000n,
      target_date: 1735689600n,
      locked: false,
    }
    const scVal = StellarSdk.nativeToScVal(rawData)
    mockGetContractData.mockResolvedValue(mockContractDataEntry(scVal) as any)

    const completed = await isGoalCompleted('goal-1')
    expect(completed).toBe(true)
  })

  it('returns false when currentAmount < targetAmount', async () => {
    const rawData = {
      name: 'Fund',
      target_amount: 10000n,
      current_amount: 3000n,
      target_date: 1735689600n,
      locked: false,
    }
    const scVal = StellarSdk.nativeToScVal(rawData)
    mockGetContractData.mockResolvedValue(mockContractDataEntry(scVal) as any)

    const completed = await isGoalCompleted('goal-1')
    expect(completed).toBe(false)
  })

  it('returns false when goal does not exist', async () => {
    mockGetContractData.mockResolvedValue(null)

    const completed = await isGoalCompleted('goal-999')
    expect(completed).toBe(false)
  })

  it('propagates ContractReadError thrown by getGoal', async () => {
    mockGetContractData.mockRejectedValue(new Error('RPC error'))

    await expect(isGoalCompleted('goal-1')).rejects.toThrow(ContractReadError)
  })
})
