import {
  Account,
  BASE_FEE,
  Contract,
  Networks,
  scValToNative,
  SorobanRpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { getSorobanNetwork, resolveContractId } from './contract-id-resolver';

export interface SplitConfig {
  savings_percent: number;
  bills_percent: number;
  insurance_percent: number;
  family_percent: number;
}

export interface SplitAmounts {
  savings: string;
  bills: string;
  insurance: string;
  family: string;
  remainder: string;
}

const getRpcServer = (env: 'testnet' | 'mainnet' = 'testnet'): SorobanRpc.Server => {
  const url = env === 'mainnet' 
    ? 'https://soroban-rpc.mainnet.stellar.org'
    : 'https://soroban-rpc.testnet.stellar.org';
  return new SorobanRpc.Server(url);
};

export async function getSplit(env: 'testnet' | 'mainnet' = getSorobanNetwork()): Promise<SplitConfig | null> {
  const contractId = resolveContractId('REMITTANCE_SPLIT_CONTRACT_ID', env);

  try {
    const server = getRpcServer(env);
    const contract = new Contract(contractId);
    const networkPassphrase = env === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
    const sourceAccount = new Account(
      'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
      '0'
    );

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call('get_split'))
      .setTimeout(30)
      .build();

    const simulation = (await server.simulateTransaction(tx)) as {
      result?: { retval?: xdr.ScVal };
      error?: string;
    };

    if (simulation.error) {
      if (simulation.error.includes('not found')) return null;
      throw new Error(simulation.error);
    }

    if (!simulation.result?.retval) {
      return null;
    }

    return scValToNative(simulation.result.retval) as SplitConfig;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return null;
    }
    throw new Error(`Failed to read split config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getConfig(env: 'testnet' | 'mainnet' = getSorobanNetwork()): Promise<SplitConfig | null> {
  return getSplit(env);
}

export async function calculateSplit(amount: number, env: 'testnet' | 'mainnet' = getSorobanNetwork()): Promise<SplitAmounts | null> {
  const config = await getSplit(env);
  if (!config) return null;

  const savings = Math.floor(amount * config.savings_percent / 100);
  const bills = Math.floor(amount * config.bills_percent / 100);
  const insurance = Math.floor(amount * config.insurance_percent / 100);
  const family = Math.floor(amount * config.family_percent / 100);
  const remainder = amount - (savings + bills + insurance + family);

  return {
    savings: savings.toString(),
    bills: bills.toString(),
    insurance: insurance.toString(),
    family: family.toString(),
    remainder: remainder.toString()
  };
}
