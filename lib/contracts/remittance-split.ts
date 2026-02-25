import { Contract, SorobanRpc, Networks } from '@stellar/stellar-sdk';

interface SplitConfig {
  savings_percent: number;
  bills_percent: number;
  insurance_percent: number;
  family_percent: number;
}

interface SplitAmounts {
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

export async function getSplit(env: 'testnet' | 'mainnet' = 'testnet'): Promise<SplitConfig | null> {
  const contractId = process.env.REMITTANCE_SPLIT_CONTRACT_ID;
  if (!contractId) {
    throw new Error('REMITTANCE_SPLIT_CONTRACT_ID not configured');
  }

  try {
    const server = getRpcServer(env);
    const contract = new Contract(contractId);
    
    const result = await server.getContractData(contractId, contract.call('get_split'));
    
    if (!result) return null;
    
    // Parse contract response - adjust based on actual contract structure
    return result as unknown as SplitConfig;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return null;
    }
    throw new Error(`Failed to read split config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getConfig(env: 'testnet' | 'mainnet' = 'testnet'): Promise<SplitConfig | null> {
  return getSplit(env);
}

export async function calculateSplit(amount: number, env: 'testnet' | 'mainnet' = 'testnet'): Promise<SplitAmounts | null> {
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
