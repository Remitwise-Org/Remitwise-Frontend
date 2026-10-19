import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Networks } from '@stellar/stellar-sdk'
import {
  getSorobanNetwork,
  getSorobanNetworkPassphrase,
  resolveContractId,
  getResolvedContractIds,
  ContractName
} from './network-resolution'

describe('network-resolution', () => {
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    // Save current process.env
    originalEnv = { ...process.env }

    // Clear relevant env variables to start with a clean state
    const keysToRemove = [
      'SOROBAN_NETWORK',
      'STELLAR_NETWORK',
      'NEXT_PUBLIC_STELLAR_NETWORK',
      'CONTRACT_IDS_JSON',
      // Remittance Split
      'REMITTANCE_SPLIT_CONTRACT_ID',
      'REMITTANCE_SPLIT_CONTRACT_ID_TESTNET',
      'REMITTANCE_SPLIT_CONTRACT_ID_MAINNET',
      'REMITTANCE_CONTRACT_ID',
      'REMITTANCE_CONTRACT_ID_TESTNET',
      'REMITTANCE_CONTRACT_ID_MAINNET',
      'NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID',
      'NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID_TESTNET',
      'NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID_MAINNET',
      'NEXT_PUBLIC_SPLIT_CONTRACT_ID',
      'NEXT_PUBLIC_SPLIT_CONTRACT_ID_TESTNET',
      'NEXT_PUBLIC_SPLIT_CONTRACT_ID_MAINNET',
      // Savings Goals
      'SAVINGS_GOALS_CONTRACT_ID',
      'SAVINGS_GOALS_CONTRACT_ID_TESTNET',
      'SAVINGS_GOALS_CONTRACT_ID_MAINNET',
      'SAVINGS_CONTRACT_ID',
      'SAVINGS_CONTRACT_ID_TESTNET',
      'SAVINGS_CONTRACT_ID_MAINNET',
      'NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID',
      'NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID_TESTNET',
      'NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID_MAINNET',
      // Bill Payments
      'BILL_PAYMENTS_CONTRACT_ID',
      'BILL_PAYMENTS_CONTRACT_ID_TESTNET',
      'BILL_PAYMENTS_CONTRACT_ID_MAINNET',
      'BILLS_CONTRACT_ID',
      'BILLS_CONTRACT_ID_TESTNET',
      'BILLS_CONTRACT_ID_MAINNET',
      'NEXT_PUBLIC_BILL_PAYMENTS_CONTRACT_ID',
      'NEXT_PUBLIC_BILL_PAYMENTS_CONTRACT_ID_TESTNET',
      'NEXT_PUBLIC_BILL_PAYMENTS_CONTRACT_ID_MAINNET',
      // Insurance
      'INSURANCE_CONTRACT_ID',
      'INSURANCE_CONTRACT_ID_TESTNET',
      'INSURANCE_CONTRACT_ID_MAINNET',
      'NEXT_PUBLIC_INSURANCE_CONTRACT_ID',
      'NEXT_PUBLIC_INSURANCE_CONTRACT_ID_TESTNET',
      'NEXT_PUBLIC_INSURANCE_CONTRACT_ID_MAINNET',
      // Family Wallet
      'FAMILY_WALLET_CONTRACT_ID',
      'FAMILY_WALLET_CONTRACT_ID_TESTNET',
      'FAMILY_WALLET_CONTRACT_ID_MAINNET',
      'NEXT_PUBLIC_FAMILY_WALLET_CONTRACT_ID',
      'NEXT_PUBLIC_FAMILY_WALLET_CONTRACT_ID_TESTNET',
      'NEXT_PUBLIC_FAMILY_WALLET_CONTRACT_ID_MAINNET',
    ]

    for (const key of keysToRemove) {
      delete process.env[key]
    }
  })

  afterEach(() => {
    // Restore process.env
    for (const key in process.env) {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    }
    for (const key in originalEnv) {
      process.env[key] = originalEnv[key]
    }
  })

  describe('getSorobanNetwork', () => {
    it('defaults to testnet when no network env vars are set', () => {
      expect(getSorobanNetwork()).toBe('testnet')
    })

    it('honors SOROBAN_NETWORK precedence over others', () => {
      process.env.SOROBAN_NETWORK = 'mainnet'
      process.env.STELLAR_NETWORK = 'testnet'
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet'
      expect(getSorobanNetwork()).toBe('mainnet')
    })

    it('honors STELLAR_NETWORK precedence over NEXT_PUBLIC_STELLAR_NETWORK', () => {
      process.env.STELLAR_NETWORK = 'mainnet'
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet'
      expect(getSorobanNetwork()).toBe('mainnet')
    })

    it('uses NEXT_PUBLIC_STELLAR_NETWORK if others are missing', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'mainnet'
      expect(getSorobanNetwork()).toBe('mainnet')
    })

    it('throws error for invalid network values', () => {
      process.env.SOROBAN_NETWORK = 'invalid-network'
      expect(() => getSorobanNetwork()).toThrow(
        'Invalid SOROBAN_NETWORK: "invalid-network". Expected "testnet" or "mainnet".'
      )
    })
  })

  describe('getSorobanNetworkPassphrase', () => {
    it('returns Networks.TESTNET for testnet', () => {
      process.env.SOROBAN_NETWORK = 'testnet'
      expect(getSorobanNetworkPassphrase()).toBe(Networks.TESTNET)
    })

    it('returns Networks.PUBLIC for mainnet', () => {
      process.env.SOROBAN_NETWORK = 'mainnet'
      expect(getSorobanNetworkPassphrase()).toBe(Networks.PUBLIC)
    })
  })

  describe('resolveContractId', () => {
    const contracts: ContractName[] = [
      'REMITTANCE_SPLIT',
      'SAVINGS_GOALS',
      'BILL_PAYMENTS',
      'INSURANCE',
      'FAMILY_WALLET',
    ]

    it('throws when contract ID is not configured anywhere', () => {
      for (const contract of contracts) {
        expect(() => resolveContractId(contract)).toThrow(
          `Missing contract ID for ${contract} on testnet.`
        )
      }
    })

    describe('precedence rules (JSON > Scoped Env > Unscoped Env)', () => {
      it('prefers CONTRACT_IDS_JSON over scoped and unscoped env vars', () => {
        process.env.SOROBAN_NETWORK = 'testnet'
        
        // Define CONTRACT_IDS_JSON
        process.env.CONTRACT_IDS_JSON = JSON.stringify({
          testnet: {
            REMITTANCE_SPLIT_CONTRACT_ID: 'json-remittance-split-testnet',
            SAVINGS_GOALS_CONTRACT_ID: 'json-savings-goals-testnet',
            BILL_PAYMENTS_CONTRACT_ID: 'json-bill-payments-testnet',
            INSURANCE_CONTRACT_ID: 'json-insurance-testnet',
            FAMILY_WALLET_CONTRACT_ID: 'json-family-wallet-testnet',
          }
        })

        // Also define scoped and unscoped env vars
        process.env.REMITTANCE_SPLIT_CONTRACT_ID_TESTNET = 'scoped-remittance-split-testnet'
        process.env.REMITTANCE_SPLIT_CONTRACT_ID = 'unscoped-remittance-split'

        process.env.SAVINGS_GOALS_CONTRACT_ID_TESTNET = 'scoped-savings-goals-testnet'
        process.env.SAVINGS_GOALS_CONTRACT_ID = 'unscoped-savings-goals'

        process.env.BILL_PAYMENTS_CONTRACT_ID_TESTNET = 'scoped-bill-payments-testnet'
        process.env.BILL_PAYMENTS_CONTRACT_ID = 'unscoped-bill-payments'

        process.env.INSURANCE_CONTRACT_ID_TESTNET = 'scoped-insurance-testnet'
        process.env.INSURANCE_CONTRACT_ID = 'unscoped-insurance'

        process.env.FAMILY_WALLET_CONTRACT_ID_TESTNET = 'scoped-family-wallet-testnet'
        process.env.FAMILY_WALLET_CONTRACT_ID = 'unscoped-family-wallet'

        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('json-remittance-split-testnet')
        expect(resolveContractId('SAVINGS_GOALS')).toBe('json-savings-goals-testnet')
        expect(resolveContractId('BILL_PAYMENTS')).toBe('json-bill-payments-testnet')
        expect(resolveContractId('INSURANCE')).toBe('json-insurance-testnet')
        expect(resolveContractId('FAMILY_WALLET')).toBe('json-family-wallet-testnet')
      })

      it('prefers scoped network env var over unscoped env var when JSON is absent', () => {
        process.env.SOROBAN_NETWORK = 'mainnet'

        // Define scoped and unscoped env vars
        process.env.REMITTANCE_SPLIT_CONTRACT_ID_MAINNET = 'scoped-remittance-split-mainnet'
        process.env.REMITTANCE_SPLIT_CONTRACT_ID = 'unscoped-remittance-split'

        process.env.SAVINGS_GOALS_CONTRACT_ID_MAINNET = 'scoped-savings-goals-mainnet'
        process.env.SAVINGS_GOALS_CONTRACT_ID = 'unscoped-savings-goals'

        process.env.BILL_PAYMENTS_CONTRACT_ID_MAINNET = 'scoped-bill-payments-mainnet'
        process.env.BILL_PAYMENTS_CONTRACT_ID = 'unscoped-bill-payments'

        process.env.INSURANCE_CONTRACT_ID_MAINNET = 'scoped-insurance-mainnet'
        process.env.INSURANCE_CONTRACT_ID = 'unscoped-insurance'

        process.env.FAMILY_WALLET_CONTRACT_ID_MAINNET = 'scoped-family-wallet-mainnet'
        process.env.FAMILY_WALLET_CONTRACT_ID = 'unscoped-family-wallet'

        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('scoped-remittance-split-mainnet')
        expect(resolveContractId('SAVINGS_GOALS')).toBe('scoped-savings-goals-mainnet')
        expect(resolveContractId('BILL_PAYMENTS')).toBe('scoped-bill-payments-mainnet')
        expect(resolveContractId('INSURANCE')).toBe('scoped-insurance-mainnet')
        expect(resolveContractId('FAMILY_WALLET')).toBe('scoped-family-wallet-mainnet')
      })

      it('falls back to unscoped env var when both JSON and scoped env vars are absent', () => {
        process.env.SOROBAN_NETWORK = 'testnet'

        // Define only unscoped env vars
        process.env.REMITTANCE_SPLIT_CONTRACT_ID = 'unscoped-remittance-split'
        process.env.SAVINGS_GOALS_CONTRACT_ID = 'unscoped-savings-goals'
        process.env.BILL_PAYMENTS_CONTRACT_ID = 'unscoped-bill-payments'
        process.env.INSURANCE_CONTRACT_ID = 'unscoped-insurance'
        process.env.FAMILY_WALLET_CONTRACT_ID = 'unscoped-family-wallet'

        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('unscoped-remittance-split')
        expect(resolveContractId('SAVINGS_GOALS')).toBe('unscoped-savings-goals')
        expect(resolveContractId('BILL_PAYMENTS')).toBe('unscoped-bill-payments')
        expect(resolveContractId('INSURANCE')).toBe('unscoped-insurance')
        expect(resolveContractId('FAMILY_WALLET')).toBe('unscoped-family-wallet')
      })
    })

    describe('CONTRACT_IDS_JSON parsing and candidates', () => {
      it('throws error when CONTRACT_IDS_JSON is malformed JSON', () => {
        process.env.CONTRACT_IDS_JSON = '{invalid-json'
        expect(() => resolveContractId('REMITTANCE_SPLIT')).toThrow(
          'CONTRACT_IDS_JSON is not valid JSON'
        )
      })

      it('falls back to env vars when CONTRACT_IDS_JSON is valid JSON but not an object', () => {
        process.env.CONTRACT_IDS_JSON = '123'
        process.env.REMITTANCE_SPLIT_CONTRACT_ID = 'env-fallback'
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('env-fallback')
      })

      it('falls back to env vars when CONTRACT_IDS_JSON object does not have the current network key', () => {
        process.env.SOROBAN_NETWORK = 'testnet'
        process.env.CONTRACT_IDS_JSON = JSON.stringify({
          mainnet: {
            REMITTANCE_SPLIT_CONTRACT_ID: 'json-mainnet'
          }
        })
        process.env.REMITTANCE_SPLIT_CONTRACT_ID = 'env-fallback'
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('env-fallback')
      })

      it('falls back to env vars when network key in CONTRACT_IDS_JSON is not an object', () => {
        process.env.SOROBAN_NETWORK = 'testnet'
        process.env.CONTRACT_IDS_JSON = JSON.stringify({
          testnet: 'not-an-object'
        })
        process.env.REMITTANCE_SPLIT_CONTRACT_ID = 'env-fallback'
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('env-fallback')
      })

      it('resolves using JSON candidate keys in precedence order', () => {
        process.env.SOROBAN_NETWORK = 'testnet'

        // REMITTANCE_SPLIT candidates: REMITTANCE_SPLIT_CONTRACT_ID, REMITTANCE_CONTRACT_ID, remittanceSplit, remittance
        process.env.CONTRACT_IDS_JSON = JSON.stringify({
          testnet: {
            remittance: 'remittance-val',
            remittanceSplit: 'remittanceSplit-val',
            REMITTANCE_CONTRACT_ID: 'REMITTANCE_CONTRACT_ID-val',
            REMITTANCE_SPLIT_CONTRACT_ID: 'REMITTANCE_SPLIT_CONTRACT_ID-val',
          }
        })
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('REMITTANCE_SPLIT_CONTRACT_ID-val')

        // Remove the first candidate
        process.env.CONTRACT_IDS_JSON = JSON.stringify({
          testnet: {
            remittance: 'remittance-val',
            remittanceSplit: 'remittanceSplit-val',
            REMITTANCE_CONTRACT_ID: 'REMITTANCE_CONTRACT_ID-val',
          }
        })
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('REMITTANCE_CONTRACT_ID-val')

        // Remove the second candidate
        process.env.CONTRACT_IDS_JSON = JSON.stringify({
          testnet: {
            remittance: 'remittance-val',
            remittanceSplit: 'remittanceSplit-val',
          }
        })
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('remittanceSplit-val')

        // Remove the third candidate
        process.env.CONTRACT_IDS_JSON = JSON.stringify({
          testnet: {
            remittance: 'remittance-val',
          }
        })
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('remittance-val')
      })

      it('returns null from JSON resolution and falls back to env vars when network key is present but contains none of the candidate keys', () => {
        process.env.SOROBAN_NETWORK = 'testnet'
        process.env.CONTRACT_IDS_JSON = JSON.stringify({
          testnet: {
            SOME_OTHER_KEY: 'some-value'
          }
        })
        process.env.REMITTANCE_SPLIT_CONTRACT_ID = 'env-fallback'
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('env-fallback')
      })
    })

    describe('Env candidates precedence', () => {
      it('resolves scoped env candidates in priority order', () => {
        process.env.SOROBAN_NETWORK = 'testnet'

        // REMITTANCE_SPLIT env candidates:
        // REMITTANCE_SPLIT_CONTRACT_ID, REMITTANCE_CONTRACT_ID, NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID, NEXT_PUBLIC_SPLIT_CONTRACT_ID
        process.env.REMITTANCE_SPLIT_CONTRACT_ID_TESTNET = 'val-1'
        process.env.REMITTANCE_CONTRACT_ID_TESTNET = 'val-2'
        process.env.NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID_TESTNET = 'val-3'
        process.env.NEXT_PUBLIC_SPLIT_CONTRACT_ID_TESTNET = 'val-4'

        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('val-1')

        delete process.env.REMITTANCE_SPLIT_CONTRACT_ID_TESTNET
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('val-2')

        delete process.env.REMITTANCE_CONTRACT_ID_TESTNET
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('val-3')

        delete process.env.NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID_TESTNET
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('val-4')
      })

      it('resolves unscoped env candidates in priority order', () => {
        process.env.SOROBAN_NETWORK = 'testnet'

        // REMITTANCE_SPLIT env candidates:
        // REMITTANCE_SPLIT_CONTRACT_ID, REMITTANCE_CONTRACT_ID, NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID, NEXT_PUBLIC_SPLIT_CONTRACT_ID
        process.env.REMITTANCE_SPLIT_CONTRACT_ID = 'un-1'
        process.env.REMITTANCE_CONTRACT_ID = 'un-2'
        process.env.NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID = 'un-3'
        process.env.NEXT_PUBLIC_SPLIT_CONTRACT_ID = 'un-4'

        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('un-1')

        delete process.env.REMITTANCE_SPLIT_CONTRACT_ID
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('un-2')

        delete process.env.REMITTANCE_CONTRACT_ID
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('un-3')

        delete process.env.NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID
        expect(resolveContractId('REMITTANCE_SPLIT')).toBe('un-4')
      })

      it('asserts that mainnet scoped variables are not used on testnet and vice versa', () => {
        process.env.SOROBAN_NETWORK = 'testnet'
        process.env.REMITTANCE_SPLIT_CONTRACT_ID_MAINNET = 'mainnet-val'

        expect(() => resolveContractId('REMITTANCE_SPLIT')).toThrow()

        process.env.SOROBAN_NETWORK = 'mainnet'
        process.env.REMITTANCE_SPLIT_CONTRACT_ID_TESTNET = 'testnet-val'
        // Clear mainnet var to force error/fallback
        delete process.env.REMITTANCE_SPLIT_CONTRACT_ID_MAINNET

        expect(() => resolveContractId('REMITTANCE_SPLIT')).toThrow()
      })
    })
  })

  describe('getResolvedContractIds', () => {
    it('returns contract IDs for configured contracts and null for unconfigured contracts without throwing', () => {
      process.env.SOROBAN_NETWORK = 'testnet'
      
      // Configure only INSURANCE and FAMILY_WALLET
      process.env.INSURANCE_CONTRACT_ID = 'insurance-id'
      process.env.FAMILY_WALLET_CONTRACT_ID_TESTNET = 'family-wallet-id'

      const resolved = getResolvedContractIds()
      expect(resolved).toEqual({
        REMITTANCE_SPLIT: null,
        SAVINGS_GOALS: null,
        BILL_PAYMENTS: null,
        INSURANCE: 'insurance-id',
        FAMILY_WALLET: 'family-wallet-id',
      })
    })
  })
})
