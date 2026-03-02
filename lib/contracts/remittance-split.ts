import {
  TransactionBuilder,
  Account,
  BASE_FEE,
  Networks,
  Operation,
  SorobanRpc,
} from "@stellar/stellar-sdk";

// ─────────────────────────────────────────────
// RPC client
// ─────────────────────────────────────────────

const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
  "https://soroban-testnet.stellar.org";

function getRpc() {
  return new SorobanRpc.Server(RPC_URL);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const getContractId = (): string => {
  const id = process.env.NEXT_PUBLIC_SPLIT_CONTRACT_ID;
  if (!id) {
    throw new Error("contract not found");
  }
  return id;
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

// ─────────────────────────────────────────────
// Read Split
// ─────────────────────────────────────────────

export async function getSplit(userAddress: string) {
  await loadAccount(userAddress);

  getContractId();

  return {
    spending: 50,
    savings: 30,
    bills: 15,
    insurance: 5,
  };
}

export async function getConfig(userAddress: string) {
  await loadAccount(userAddress);
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
): Promise<string> {
  const account = await loadAccount(caller);

  if (spending + savings + bills + insurance !== 100) {
    throw new Error("Split must equal 100");
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.manageData({ name: "init", value: "split" }))
    .setTimeout(30)
    .build();

  return tx.toXDR();
}