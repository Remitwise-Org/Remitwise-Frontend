export type SorobanNetwork = 'testnet' | 'mainnet';

const SUPPORTED_NETWORKS: ReadonlyArray<SorobanNetwork> = ['testnet', 'mainnet'];

const CONTRACT_ENV_KEYS = {
  remittanceSplit: 'REMITTANCE_SPLIT_CONTRACT_ID',
  savingsGoals: 'SAVINGS_GOALS_CONTRACT_ID',
  billPayments: 'BILL_PAYMENTS_CONTRACT_ID',
  insurance: 'INSURANCE_CONTRACT_ID',
  familyWallet: 'FAMILY_WALLET_CONTRACT_ID',
} as const;

type ContractKey = keyof typeof CONTRACT_ENV_KEYS;

function parseContractIdsJson(): Record<string, Record<string, string> | string> | null {
  const raw = process.env.CONTRACT_IDS_JSON;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('CONTRACT_IDS_JSON must be a JSON object');
    }
    return parsed as Record<string, Record<string, string> | string>;
  } catch (error) {
    throw new Error(
      `Failed to parse CONTRACT_IDS_JSON: ${error instanceof Error ? error.message : 'Unknown parse error'}`
    );
  }
}

export function getSorobanNetwork(): SorobanNetwork {
  const raw = (process.env.SOROBAN_NETWORK ?? 'testnet').toLowerCase();
  if (raw !== 'testnet' && raw !== 'mainnet') {
    throw new Error(
      `Invalid SOROBAN_NETWORK "${raw}". Expected one of: ${SUPPORTED_NETWORKS.join(', ')}`
    );
  }
  return raw;
}

export function resolveContractId(
  envBaseKey: string,
  network: SorobanNetwork = getSorobanNetwork()
): string {
  const normalizedBaseKey = envBaseKey.trim().toUpperCase();
  const networkKey = `${normalizedBaseKey}_${network.toUpperCase()}`;

  const networkSpecificEnv = process.env[networkKey];
  if (networkSpecificEnv) {
    return networkSpecificEnv;
  }

  const fromJson = parseContractIdsJson()?.[network];
  if (fromJson && typeof fromJson === 'object' && !Array.isArray(fromJson)) {
    const jsonNetworkValue = fromJson[networkKey] ?? fromJson[normalizedBaseKey];
    if (typeof jsonNetworkValue === 'string' && jsonNetworkValue.length > 0) {
      return jsonNetworkValue;
    }
  }

  // Backward-compatible fallback to a single contract ID.
  const fallback = process.env[normalizedBaseKey];
  if (fallback) {
    return fallback;
  }

  throw new Error(
    `Contract ID not configured for ${normalizedBaseKey} on ${network}. ` +
      `Set ${networkKey} or provide CONTRACT_IDS_JSON with a "${network}" key.`
  );
}

export function getResolvedContractIdsForNetwork(
  network: SorobanNetwork = getSorobanNetwork()
): Record<ContractKey, string | null> {
  return {
    remittanceSplit: safeResolve(CONTRACT_ENV_KEYS.remittanceSplit, network),
    savingsGoals: safeResolve(CONTRACT_ENV_KEYS.savingsGoals, network),
    billPayments: safeResolve(CONTRACT_ENV_KEYS.billPayments, network),
    insurance: safeResolve(CONTRACT_ENV_KEYS.insurance, network),
    familyWallet: safeResolve(CONTRACT_ENV_KEYS.familyWallet, network),
  };
}

function safeResolve(envBaseKey: string, network: SorobanNetwork): string | null {
  try {
    return resolveContractId(envBaseKey, network);
  } catch {
    return null;
  }
}
