import { Networks } from "@stellar/stellar-sdk";

export type SorobanNetwork = "testnet" | "mainnet";

export type ContractName =
  | "REMITTANCE_SPLIT"
  | "SAVINGS_GOALS"
  | "BILL_PAYMENTS"
  | "INSURANCE"
  | "FAMILY_WALLET";

const CONTRACT_ENV_CANDIDATES: Record<ContractName, string[]> = {
  REMITTANCE_SPLIT: [
    "REMITTANCE_SPLIT_CONTRACT_ID",
    "REMITTANCE_CONTRACT_ID",
    "NEXT_PUBLIC_REMITTANCE_SPLIT_CONTRACT_ID",
    "NEXT_PUBLIC_SPLIT_CONTRACT_ID",
  ],
  SAVINGS_GOALS: [
    "SAVINGS_GOALS_CONTRACT_ID",
    "SAVINGS_CONTRACT_ID",
    "NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID",
  ],
  BILL_PAYMENTS: [
    "BILL_PAYMENTS_CONTRACT_ID",
    "BILLS_CONTRACT_ID",
    "NEXT_PUBLIC_BILL_PAYMENTS_CONTRACT_ID",
  ],
  INSURANCE: ["INSURANCE_CONTRACT_ID", "NEXT_PUBLIC_INSURANCE_CONTRACT_ID"],
  FAMILY_WALLET: [
    "FAMILY_WALLET_CONTRACT_ID",
    "NEXT_PUBLIC_FAMILY_WALLET_CONTRACT_ID",
  ],
};

const JSON_KEY_CANDIDATES: Record<ContractName, string[]> = {
  REMITTANCE_SPLIT: [
    "REMITTANCE_SPLIT_CONTRACT_ID",
    "REMITTANCE_CONTRACT_ID",
    "remittanceSplit",
    "remittance",
  ],
  SAVINGS_GOALS: [
    "SAVINGS_GOALS_CONTRACT_ID",
    "SAVINGS_CONTRACT_ID",
    "savingsGoals",
    "savings",
  ],
  BILL_PAYMENTS: [
    "BILL_PAYMENTS_CONTRACT_ID",
    "BILLS_CONTRACT_ID",
    "billPayments",
    "bills",
  ],
  INSURANCE: ["INSURANCE_CONTRACT_ID", "insurance"],
  FAMILY_WALLET: ["FAMILY_WALLET_CONTRACT_ID", "familyWallet"],
};

function isSupportedNetwork(network: string): network is SorobanNetwork {
  return network === "testnet" || network === "mainnet";
}

export function getSorobanNetwork(): SorobanNetwork {
  const raw =
    process.env.SOROBAN_NETWORK ??
    process.env.STELLAR_NETWORK ??
    process.env.NEXT_PUBLIC_STELLAR_NETWORK ??
    "testnet";

  if (!isSupportedNetwork(raw)) {
    throw new Error(
      `Invalid SOROBAN_NETWORK: "${raw}". Expected "testnet" or "mainnet".`
    );
  }

  return raw;
}

export function getSorobanNetworkPassphrase(): string {
  const network = getSorobanNetwork();
  return network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}

function parseContractIdsJson(): unknown {
  const raw = process.env.CONTRACT_IDS_JSON;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("CONTRACT_IDS_JSON is not valid JSON");
  }
}

function getFromContractIdsJson(contract: ContractName): string | null {
  const parsed = parseContractIdsJson();
  if (!parsed || typeof parsed !== "object") return null;

  const network = getSorobanNetwork();
  const networkConfig = (parsed as Record<string, unknown>)[network];
  if (!networkConfig || typeof networkConfig !== "object") return null;

  for (const key of JSON_KEY_CANDIDATES[contract]) {
    const value = (networkConfig as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function getFromEnv(contract: ContractName): string | null {
  const networkSuffix = getSorobanNetwork().toUpperCase();

  for (const envKey of CONTRACT_ENV_CANDIDATES[contract]) {
    const networkScoped = process.env[`${envKey}_${networkSuffix}`];
    if (typeof networkScoped === "string" && networkScoped.trim()) {
      return networkScoped;
    }
  }

  for (const envKey of CONTRACT_ENV_CANDIDATES[contract]) {
    const value = process.env[envKey];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export function resolveContractId(contract: ContractName): string {
  const fromJson = getFromContractIdsJson(contract);
  if (fromJson) return fromJson;

  const fromEnv = getFromEnv(contract);
  if (fromEnv) return fromEnv;

  const network = getSorobanNetwork();
  throw new Error(
    `Missing contract ID for ${contract} on ${network}. Set CONTRACT_IDS_JSON or network-specific env vars.`
  );
}

export function getResolvedContractIds(): Record<ContractName, string | null> {
  const names = Object.keys(CONTRACT_ENV_CANDIDATES) as ContractName[];
  return names.reduce(
    (acc, name) => {
      try {
        acc[name] = resolveContractId(name);
      } catch {
        acc[name] = null;
      }
      return acc;
    },
    {} as Record<ContractName, string | null>
  );
}
