// Transaction builders for savings goals smart contract

import * as StellarSdk from '@stellar/stellar-sdk';
import { BuildTxResult } from '@/lib/types/savings-goals';
import { parseContractError } from '@/lib/errors/contract-errors';
import { getServer, getNetworkPassphrase } from '@/lib/soroban/client';
import {
  getSorobanNetwork,
  resolveContractId,
} from '@/lib/contracts/network-resolution';

const getContractId = (): string => resolveContractId('SAVINGS_GOALS');

// Get network configuration
const getNetworkConfig = () => {
  const network = getSorobanNetwork();
  return {
    network,
    networkPassphrase: getNetworkPassphrase(),
  };
};

export class ContractReadError extends Error {
  constructor(
    public readonly contractId: string,
    public readonly method: string,
    public readonly cause: unknown
  ) {
    super(
      `Contract read failed - ${contractId}::${method}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    );
    this.name = 'ContractReadError';
  }
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: number;
  locked: boolean;
}

const RPC_TIMEOUT_MS = 10_000;
const MAX_READ_RETRIES = 1;

async function withReadRetry<T>(
  label: string,
  promiseFactory: () => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_READ_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

    try {
      return await Promise.race([
        promiseFactory(),
        new Promise<never>((_, reject) =>
          controller.signal.addEventListener('abort', () =>
            reject(new Error(
              `RPC call "${label}" timed out after ${RPC_TIMEOUT_MS} ms`
            ))
          )
        ),
      ]);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

function mapToGoal(id: string, rawData: any): SavingsGoal {
  return {
    id,
    name: rawData.name?.toString() || 'Unnamed Goal',
    targetAmount: Number(rawData.target_amount) || 0,
    currentAmount: Number(rawData.current_amount) || 0,
    targetDate: Number(rawData.target_date) || 0,
    locked: !!rawData.locked,
  };
}

export async function getGoal(goalId: string): Promise<SavingsGoal | null> {
  const contractId = getContractId();

  try {
    const result = await withReadRetry('getGoal', () =>
      getServer().getContractData(
        contractId,
        StellarSdk.nativeToScVal(goalId),
        StellarSdk.SorobanRpc.Durability.Persistent
      )
    );

    if (!result) return null;

    const scVal = result.val.contractData().val();
    return mapToGoal(goalId, StellarSdk.scValToNative(scVal));
  } catch (error) {
    if (error instanceof ContractReadError) throw error;
    throw new ContractReadError(contractId, 'getGoal', error);
  }
}

export async function getAllGoals(owner: string): Promise<SavingsGoal[]> {
  const contractId = getContractId();

  try {
    const contract = new StellarSdk.Contract(contractId);
    const operation = contract.call('get_all_goals', StellarSdk.nativeToScVal(owner));
    const response = await withReadRetry('getAllGoals', () =>
      getServer().simulateTransaction(operation as any)
    );

    if (!('result' in response)) {
      throw new ContractReadError(
        contractId,
        'getAllGoals',
        (response as any).error ?? 'Simulation failed'
      );
    }

    const result = response.result;
    if (!result || !result.retval) {
      throw new ContractReadError(
        contractId,
        'getAllGoals',
        'No return value in simulation'
      );
    }

    const rawGoals = StellarSdk.scValToNative(result.retval);
    if (typeof rawGoals !== 'object' || rawGoals === null) {
      throw new ContractReadError(
        contractId,
        'getAllGoals',
        `Unexpected return type: ${typeof rawGoals}`
      );
    }

    return Object.entries(rawGoals).map(([id, data]) =>
      mapToGoal(id, data)
    );
  } catch (error) {
    if (error instanceof ContractReadError) throw error;
    throw new ContractReadError(contractId, 'getAllGoals', error);
  }
}

export async function isGoalCompleted(goalId: string): Promise<boolean> {
  const goal = await getGoal(goalId);
  if (!goal) return false;
  return goal.currentAmount >= goal.targetAmount;
}

/**
 * Build a transaction to create a new savings goal
 * 
 * @param owner - Stellar public key of the goal owner
 * @param name - Name of the savings goal
 * @param targetAmount - Target amount to save
 * @param targetDate - Target date in ISO 8601 format
 * @returns Transaction XDR string
 */
export async function buildCreateGoalTx(
  owner: string,
  name: string,
  targetAmount: number,
  targetDate: string
): Promise<BuildTxResult> {
  try {
    const config = getNetworkConfig();
    const contractId = getContractId();
    
    // Create contract instance
    const contract = new StellarSdk.Contract(contractId);
    
    // Convert parameters to Stellar SDK types
    const ownerAddress = new StellarSdk.Address(owner);
    const nameScVal = StellarSdk.nativeToScVal(name, { type: 'string' });
    const amountScVal = StellarSdk.nativeToScVal(targetAmount, { type: 'i128' });
    
    // Convert date to Unix timestamp
    const targetTimestamp = Math.floor(new Date(targetDate).getTime() / 1000);
    const timestampScVal = StellarSdk.nativeToScVal(targetTimestamp, { type: 'u64' });
    
    // Build the operation
    const operation = contract.call(
      'create_goal',
      ownerAddress.toScVal(),
      nameScVal,
      amountScVal,
      timestampScVal
    );
    
    // Create source account
    const sourceAccount = await loadAccount(owner);
    
    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(300) // 5 minutes
      .build();
    
    return {
      xdr: transaction.toXDR()
    };
  } catch (error) {
    throw parseContractError(error, {
      contractId: 'savings-goals',
      method: 'create_goal'
    });
  }
}

/**
 * Build a transaction to add funds to a savings goal
 * 
 * @param caller - Stellar public key of the caller
 * @param goalId - Unique identifier of the goal
 * @param amount - Amount to add
 * @returns Transaction XDR string
 */
export async function buildAddToGoalTx(
  caller: string,
  goalId: string,
  amount: number
): Promise<BuildTxResult> {
  const config = getNetworkConfig();
  const contractId = getContractId();
  
  const contract = new StellarSdk.Contract(contractId);
  
  // Convert parameters
  const callerAddress = new StellarSdk.Address(caller);
  const goalIdScVal = StellarSdk.nativeToScVal(goalId, { type: 'string' });
  const amountScVal = StellarSdk.nativeToScVal(amount, { type: 'i128' });
  
  // Build operation
  const operation = contract.call(
    'add_to_goal',
    callerAddress.toScVal(),
    goalIdScVal,
    amountScVal
  );
  
  const sourceAccount = await loadAccount(caller);
  
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();
  
  return {
    xdr: transaction.toXDR()
  };
}

/**
 * Build a transaction to withdraw funds from a savings goal
 * 
 * @param caller - Stellar public key of the caller
 * @param goalId - Unique identifier of the goal
 * @param amount - Amount to withdraw
 * @returns Transaction XDR string
 */
export async function buildWithdrawFromGoalTx(
  caller: string,
  goalId: string,
  amount: number
): Promise<BuildTxResult> {
  const config = getNetworkConfig();
  const contractId = getContractId();
  
  const contract = new StellarSdk.Contract(contractId);
  
  // Convert parameters
  const callerAddress = new StellarSdk.Address(caller);
  const goalIdScVal = StellarSdk.nativeToScVal(goalId, { type: 'string' });
  const amountScVal = StellarSdk.nativeToScVal(amount, { type: 'i128' });
  
  // Build operation
  const operation = contract.call(
    'withdraw_from_goal',
    callerAddress.toScVal(),
    goalIdScVal,
    amountScVal
  );
  
  const sourceAccount = await loadAccount(caller);
  
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();
  
  return {
    xdr: transaction.toXDR()
  };
}

/**
 * Build a transaction to lock a savings goal
 * 
 * @param caller - Stellar public key of the caller
 * @param goalId - Unique identifier of the goal
 * @returns Transaction XDR string
 */
export async function buildLockGoalTx(
  caller: string,
  goalId: string
): Promise<BuildTxResult> {
  const config = getNetworkConfig();
  const contractId = getContractId();
  
  const contract = new StellarSdk.Contract(contractId);
  
  // Convert parameters
  const callerAddress = new StellarSdk.Address(caller);
  const goalIdScVal = StellarSdk.nativeToScVal(goalId, { type: 'string' });
  
  // Build operation
  const operation = contract.call(
    'lock_goal',
    callerAddress.toScVal(),
    goalIdScVal
  );
  
  const sourceAccount = await loadAccount(caller);
  
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();
  
  return {
    xdr: transaction.toXDR()
  };
}

/**
 * Build a transaction to unlock a savings goal
 * 
 * @param caller - Stellar public key of the caller
 * @param goalId - Unique identifier of the goal
 * @returns Transaction XDR string
 */
export async function buildUnlockGoalTx(
  caller: string,
  goalId: string
): Promise<BuildTxResult> {
  const config = getNetworkConfig();
  const contractId = getContractId();
  
  const contract = new StellarSdk.Contract(contractId);
  
  // Convert parameters
  const callerAddress = new StellarSdk.Address(caller);
  const goalIdScVal = StellarSdk.nativeToScVal(goalId, { type: 'string' });
  
  // Build operation
  const operation = contract.call(
    'unlock_goal',
    callerAddress.toScVal(),
    goalIdScVal
  );
  
  const sourceAccount = await loadAccount(caller);
  
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();
  
  return {
    xdr: transaction.toXDR()
  };
}

/**
 * Helper function to load account from Stellar network
 */
async function loadAccount(publicKey: string): Promise<StellarSdk.Account> {
  const server = getServer();
  
  try {
    const account = await server.getAccount(publicKey);
    return account;
  } catch (error) {
    // If account doesn't exist, create a placeholder with sequence 0
    // The actual sequence will be set when the transaction is submitted
    return new StellarSdk.Account(publicKey, '0');
  }
}
