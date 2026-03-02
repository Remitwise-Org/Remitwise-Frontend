/**
 * contractService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Contract Read Service — the ONLY place in the app that talks to Stellar RPC.
 *
 * Responsibilities:
 *  • Simulate / read Soroban contract state (no transaction submission)
 *  • Parse XDR results into plain TypeScript shapes
 *  • Surface typed errors so callers can handle partial failures
 *
 * Each exported function is a standalone async operation.
 * The route handler (and aggregator) compose these freely.
 *
 * Env vars:
 *  STELLAR_RPC_URL            — e.g. https://soroban-testnet.stellar.org
 *  REMITTANCE_CONTRACT_ID     — Soroban contract address for remittance
 *  SAVINGS_CONTRACT_ID        — Soroban contract address for savings goals
 *  BILLS_CONTRACT_ID          — Soroban contract address for bill payments
 *  INSURANCE_CONTRACT_ID      — Soroban contract address for insurance
 */

import {
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  Address,
} from "@stellar/stellar-sdk";
// import { Server as SorobanServer, assembleTransaction } from "@stellar/stellar-sdk/rpc";
import { Server as SorobanServer } from "@stellar/stellar-sdk/lib/soroban";
import { BillsSummary, InsuranceSummary, RemittanceSummary, SavingsSummary } from "../types/dashboard";

// ─── RPC client (singleton) ────────────────────────────────────────────────

function getRpcServer(): SorobanServer {
  const url = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
  return new SorobanServer(url);
}

const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;

// Dummy source account used only for read simulations (no signing needed).
// Any funded account works; we use a well-known testnet faucet address.
const SIM_SOURCE = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

// ─── Shared helper ─────────────────────────────────────────────────────────

/**
 * Simulate a read-only contract call and return the decoded native JS value.
 * Throws a `ContractReadError` on any failure so callers can catch it cleanly.
 */
async function simulateRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = []
): Promise<unknown> {
  const server = getRpcServer();

  const account = await server.getAccount(SIM_SOURCE);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if ("error" in sim) {
    throw new ContractReadError(contractId, method, sim.error);
  }

//   const assembled = assembleTransaction(tx, sim);
  const resultVal = sim.result?.retval;
  if (!resultVal) {
    throw new ContractReadError(contractId, method, "No return value in simulation");
  }

  return scValToNative(resultVal);
}

// ─── Typed error ───────────────────────────────────────────────────────────

export class ContractReadError extends Error {
  constructor(
    public readonly contractId: string,
    public readonly method: string,
    public readonly cause: unknown
  ) {
    super(
      `Contract read failed — ${contractId}::${method}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    );
    this.name = "ContractReadError";
  }
}

// ─── Return shapes ─────────────────────────────────────────────────────────



// ─── Public service functions ───────────────────────────────────────────────

/**
 * Fetch remittance totals + recent transactions from the remittance contract.
 */
export async function getRemittanceSummary(
  userAddress: string
): Promise<RemittanceSummary> {
  const contractId = process.env.REMITTANCE_CONTRACT_ID;
  if (!contractId) throw new ContractReadError("", "remittance", "REMITTANCE_CONTRACT_ID not set");

  const addressVal = nativeToScVal(Address.fromString(userAddress), { type: "address" });

  // Each contract method returns a structured map that scValToNative decodes.
  const [summary, transactions] = await Promise.all([
    simulateRead(contractId, "get_user_summary", [addressVal]),
    simulateRead(contractId, "get_recent_transactions", [
      addressVal,
      nativeToScVal(10, { type: "u32" }), // limit: 10
    ]),
  ]);

  // scValToNative returns plain JS objects — cast to expected shapes.
  const s = summary as any;
  const txs = (transactions as any[]) ?? [];

  return {
    totalSent: Number(s.total_sent ?? 0),
    split: s.split ?? {},
    recentTransactions: txs.map((tx: any) => ({
      id: String(tx.id),
      amount: Number(tx.amount),
      currency: String(tx.currency),
      recipient: String(tx.recipient),
      status: tx.status ?? "completed",
      createdAt: new Date(Number(tx.created_at) * 1000).toISOString(),
    })),
  };
}

/**
 * Fetch savings goals summary from the savings contract.
 */
export async function getSavingsSummary(
  userAddress: string
): Promise<SavingsSummary> {
  const contractId = process.env.SAVINGS_CONTRACT_ID;
  if (!contractId) throw new ContractReadError("", "savings", "SAVINGS_CONTRACT_ID not set");

  const addressVal = nativeToScVal(Address.fromString(userAddress), { type: "address" });

  const goals = await simulateRead(contractId, "get_user_goals", [addressVal]);

  const list = (goals as any[]) ?? [];
  const savingsTotal = list.reduce((sum: number, g: any) => sum + Number(g.current_amount ?? 0), 0);

  return {
    savingsTotal: round2(savingsTotal),
    recentGoals: list.slice(0, 5).map((g: any) => ({
      id: String(g.id),
      name: String(g.name),
      targetAmount: Number(g.target_amount),
      currentAmount: Number(g.current_amount),
      deadline: new Date(Number(g.deadline) * 1000).toISOString(),
      status: g.status ?? "active",
    })),
  };
}

/**
 * Fetch bills summary (paid count + unpaid list) from the bills contract.
 */
export async function getBillsSummary(
  userAddress: string
): Promise<BillsSummary> {
  const contractId = process.env.BILLS_CONTRACT_ID;
  if (!contractId) throw new ContractReadError("", "bills", "BILLS_CONTRACT_ID not set");

  const addressVal = nativeToScVal(Address.fromString(userAddress), { type: "address" });

  const [paid, unpaid] = await Promise.all([
    simulateRead(contractId, "get_paid_summary", [addressVal]),
    simulateRead(contractId, "get_unpaid_bills", [addressVal]),
  ]);

  const p = paid as any;
  const now = Date.now();

  return {
    billsPaidCount: Number(p?.count ?? 0),
    billsPaidAmount: round2(Number(p?.total_amount ?? 0)),
    unpaidBills: ((unpaid as any[]) ?? []).map((b: any) => {
      const dueMs = Number(b.due_date) * 1000;
      return {
        id: String(b.id),
        name: String(b.name),
        amount: Number(b.amount),
        dueDate: new Date(dueMs).toISOString(),
        recurring: Boolean(b.recurring),
        overdue: dueMs < now,
      };
    }),
  };
}

/**
 * Fetch insurance policies summary from the insurance contract.
 */
export async function getInsuranceSummary(
  userAddress: string
): Promise<InsuranceSummary> {
  const contractId = process.env.INSURANCE_CONTRACT_ID;
  if (!contractId) throw new ContractReadError("", "insurance", "INSURANCE_CONTRACT_ID not set");

  const addressVal = nativeToScVal(Address.fromString(userAddress), { type: "address" });

  const policies = await simulateRead(contractId, "get_active_policies", [addressVal]);

  const list = (policies as any[]) ?? [];
  const totalPremium = list.reduce((sum: number, p: any) => sum + Number(p.premium ?? 0), 0);

  return {
    insurancePoliciesCount: list.length,
    insurancePremium: round2(totalPremium),
    activePolicies: list.map((p: any) => ({
      id: String(p.id),
      name: String(p.name),
      premium: Number(p.premium),
      coverageAmount: Number(p.coverage_amount),
      nextPaymentDate: new Date(Number(p.next_payment_date) * 1000).toISOString(),
      status: p.status ?? "active",
    })),
  };
}

// ─── Utility ───────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}