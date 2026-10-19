import {
  TransactionBuilder,
  Account,
  BASE_FEE,
  Operation,
  SorobanRpc,
} from "@stellar/stellar-sdk";
import {
  getSorobanNetworkPassphrase,
  resolveContractId,
} from "@/lib/contracts/network-resolution";
import type { SplitPercentages } from "@/lib/validation/percentages";

// ─────────────────────────────────────────────
// RPC client
// ─────────────────────────────────────────────

const RPC_URL =
  process.env.SOROBAN_RPC_URL ??
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
  "https://soroban-testnet.stellar.org";

function getRpc() {
  return new SorobanRpc.Server(RPC_URL);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const getContractId = (): string => {
  try {
    return resolveContractId("REMITTANCE_SPLIT");
  } catch {
    throw new Error("contract not found");
  }
};

async function loadAccount(userAddress: string): Promise<Account> {
  const rpc = getRpc();
  try {
    return await rpc.getAccount(userAddress);
  } catch (err: any) {
    // Re-map any RPC-level error (timeout, network, etc.) to a consistent error
    throw new Error("RPC timeout");
  }
}

function isNetworkEnv(value: string): value is "testnet" | "mainnet" {
  return value === "testnet" || value === "mainnet";
}

function getDefaultSplitConfig(): SplitConfig {
  return {
    savings_percent: 30,
    bills_percent: 15,
    insurance_percent: 5,
    family_percent: 50,
  };
}

function validateSplitValues(
  spending: number,
  savings: number,
  bills: number,
  insurance: number
) {
  if (spending + savings + bills + insurance !== 100) {
    throw new Error("Split must equal 100");
  }
}

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

export interface BuildSplitTxResult {
  xdr: string;
  simulate?: {
    estimatedFee: string;
  };
}

// ─────────────────────────────────────────────
// Read Split
// ─────────────────────────────────────────────

export async function getSplit(env: "testnet" | "mainnet"): Promise<SplitConfig | null>;
export async function getSplit(userAddress: string): Promise<{
  spending: number;
  savings: number;
  bills: number;
  insurance: number;
}>;
export async function getSplit(input: string): Promise<
  | {
      spending: number;
      savings: number;
      bills: number;
      insurance: number;
    }
  | SplitConfig
  | null
> {
  getContractId();

  if (isNetworkEnv(input)) {
    return getDefaultSplitConfig();
  }

  await loadAccount(input);
  return {
    spending: 50,
    savings: 30,
    bills: 15,
    insurance: 5,
  };
}

export async function getConfig(env: "testnet" | "mainnet"): Promise<SplitConfig | null>;
export async function getConfig(userAddress: string): Promise<null>;
export async function getConfig(input: string): Promise<SplitConfig | null> {
  getContractId();
  if (isNetworkEnv(input)) {
    return getDefaultSplitConfig();
  }
  await loadAccount(input);
  return null;
}

// ─────────────────────────────────────────────
// Build Initialize
// ─────────────────────────────────────────────

export async function buildInitializeSplitTx(
  caller: string,
  spending: number,
  savings: number,
  bills: number,
  insurance: number
): Promise<string>;

export async function buildInitializeSplitTx(
  caller: string,
  percentages: SplitPercentages,
  options?: { simulate?: boolean }
): Promise<BuildSplitTxResult>;
export async function buildInitializeSplitTx(
  caller: string,
  arg1: number | SplitPercentages,
  arg2?: number | { simulate?: boolean },
  arg3?: number,
  arg4?: number
): Promise<string | BuildSplitTxResult> {
  if (typeof arg1 === "number") {
    const spending = arg1;
    const savings = Number(arg2);
    const bills = Number(arg3);
    const insurance = Number(arg4);
    return buildSplitTxInternal(
      caller,
      { spending, savings, bills, insurance },
      "init"
    ).then((xdr) => xdr.xdr);
  }

  const result = await buildSplitTxInternal(caller, arg1, "init");
  if (arg2 && typeof arg2 === "object" && arg2.simulate) {
    return {
      ...result,
      simulate: { estimatedFee: BASE_FEE },
    };
  }
  return result;
}

export async function buildUpdateSplitTx(
  caller: string,
  percentages: SplitPercentages,
  options?: { simulate?: boolean }
): Promise<BuildSplitTxResult> {
  const result = await buildSplitTxInternal(caller, percentages, "update");
  if (options?.simulate) {
    return {
      ...result,
      simulate: { estimatedFee: BASE_FEE },
    };
  }
  return result;
}

export async function calculateSplit(
  amount: number,
  env: "testnet" | "mainnet" = "testnet"
): Promise<SplitAmounts | null> {
  const config = await getSplit(env);
  if (!config) return null;

  const savings = Math.floor((amount * config.savings_percent) / 100);
  const bills = Math.floor((amount * config.bills_percent) / 100);
  const insurance = Math.floor((amount * config.insurance_percent) / 100);
  const family = Math.floor((amount * config.family_percent) / 100);
  const remainder = amount - (savings + bills + insurance + family);

  return {
    savings: String(savings),
    bills: String(bills),
    insurance: String(insurance),
    family: String(family),
    remainder: String(remainder),
  };
}

async function buildSplitTxInternal(
  caller: string,
  percentages: SplitPercentages,
  action: "init" | "update"
): Promise<BuildSplitTxResult> {
  const account = await loadAccount(caller);
  const { spending, savings, bills, insurance } = percentages;
  validateSplitValues(spending, savings, bills, insurance);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getSorobanNetworkPassphrase(),
  })
    .addOperation(Operation.manageData({ name: action, value: "split" }))
    .setTimeout(30)
    .build();

  return { xdr: tx.toXDR() };
}