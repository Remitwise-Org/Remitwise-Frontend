import { StrKey, TransactionBuilder, Account, BASE_FEE, Networks, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import { Contract } from "@stellar/stellar-sdk/contract";
import { FamilyMember, FamilyMemberRole } from "@/utils/types/family-wallet.types";
import { resolveContractId } from "@/lib/contracts/network-resolution";
import { validateSpendingLimit } from "@/lib/validation/family-limits";
import { fitsInI128 } from "@/lib/utils/i128";

const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const HORIZON_URL = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const FAMILY_WALLET_CONTRACT_ID = process.env.FAMILY_WALLET_CONTRACT_ID ?? "";
const TX_TIMEOUT = 300;

const VALID_ROLES: FamilyMemberRole[] = ["admin", "sender", "recipient"];

function assertValidAddress(address: string, field: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw Object.assign(new Error(`Invalid Stellar address for ${field}`), { code: "INVALID_ADDRESS", status: 422 });
  }
}

function assertValidRole(role: string) {
  if (!VALID_ROLES.includes(role as FamilyMemberRole)) {
    throw Object.assign(new Error(`Invalid role: ${role}. Must be one of ${VALID_ROLES.join(", ")}`), { code: "INVALID_ROLE", status: 422 });
  }
}

function assertValidLimit(limit: number) {
  const v = validateSpendingLimit(limit);
  if (!v.isValid) throw Object.assign(new Error(v.error ?? "Invalid spending limit"), { code: "INVALID_LIMIT", status: 422 });
  if (!fitsInI128(limit)) throw Object.assign(new Error("Spending limit exceeds i128 max"), { code: "LIMIT_TOO_LARGE", status: 422 });
}

async function loadAccount(address: string): Promise<Account> {
  const { Horizon } = await import("@stellar/stellar-sdk");
  const server = new Horizon.Server(HORIZON_URL);
  return server.loadAccount(address);
}

export async function buildAddMemberTx(
  adminAddress: string,
  memberAddress: string,
  role: FamilyMemberRole,
  spendingLimit: number
): Promise<string> {
  assertValidAddress(adminAddress, "adminAddress");
  assertValidAddress(memberAddress, "memberAddress");
  assertValidRole(role);
  assertValidLimit(spendingLimit);

  if (!FAMILY_WALLET_CONTRACT_ID) throw new Error("FAMILY_WALLET_CONTRACT_ID is not configured");

  const account = await loadAccount(adminAddress);
  const contract = new Contract(FAMILY_WALLET_CONTRACT_ID);
  const limitStroops = BigInt(Math.round(spendingLimit * 1e7));

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "add_member",
        nativeToScVal(memberAddress, { type: "address" }),
        nativeToScVal(role, { type: "symbol" }),
        nativeToScVal(limitStroops, { type: "i128" }),
      ),
    )
    .setTimeout(TX_TIMEOUT)
    .build();

  return tx.toXDR();
}

export async function buildUpdateSpendingLimitTx(
  callerAddress: string,
  memberId: string,
  newLimit: number
): Promise<string> {
  assertValidAddress(callerAddress, "callerAddress");
  if (!memberId) throw Object.assign(new Error("memberId is required"), { code: "MISSING_MEMBER_ID", status: 422 });
  assertValidLimit(newLimit);

  if (!FAMILY_WALLET_CONTRACT_ID) throw new Error("FAMILY_WALLET_CONTRACT_ID is not configured");

  const account = await loadAccount(callerAddress);
  const contract = new Contract(FAMILY_WALLET_CONTRACT_ID);
  const limitStroops = BigInt(Math.round(newLimit * 1e7));

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "update_spending_limit",
        nativeToScVal(memberId, { type: "string" }),
        nativeToScVal(limitStroops, { type: "i128" }),
      ),
    )
    .setTimeout(TX_TIMEOUT)
    .build();

  return tx.toXDR();
}

// ─── Read helpers ────────────────────────────────────────────────────────────
//
// These wrap Soroban read-only `simulateTransaction` calls. When the contract
// id is not configured for the active network, the helpers return a safe empty
// result rather than throwing so the UI can render an empty state; callers
// that need to signal "service unavailable" should check the contract id up
// front with `resolveContractId("FAMILY_WALLET")`.

function resolveFamilyContractId(): string | null {
  try {
    return resolveContractId("FAMILY_WALLET");
  } catch {
    const fallback = process.env.FAMILY_WALLET_CONTRACT_ID;
    return fallback && fallback.length > 0 ? fallback : null;
  }
}

async function simulateContractRead(
  method: string,
  args: xdr.ScVal[],
): Promise<unknown | null> {
  const contractId = resolveFamilyContractId();
  if (!contractId) return null;

  try {
    // Lazy-load to keep this module importable in environments where the
    // Soroban RPC client isn't wired (e.g. edge runtime builds).
    const { getServer, getNetworkPassphrase } = await import("@/lib/soroban/client");
    const server = getServer();
    const contract = new Contract(contractId);

    // Any funded account works for simulation; sequence 0 is fine because the
    // tx is never submitted.
    const sourceKeypair = StrKey.encodeEd25519PublicKey(Buffer.alloc(32));
    const account = new Account(sourceKeypair, "0");
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(TX_TIMEOUT)
      .build();

    const sim = await server.simulateTransaction(tx);
    const retval = (sim as { result?: { retval?: xdr.ScVal } }).result?.retval;
    return retval ? scValToNative(retval) : null;
  } catch (err) {
    console.warn(`[family-wallet] simulate ${method} failed`, err);
    return null;
  }
}

export async function getMember(identifier: string): Promise<FamilyMember | null> {
  if (!identifier) return null;
  const native = await simulateContractRead("get_member", [
    nativeToScVal(identifier, { type: "string" }),
  ]);
  return (native ?? null) as FamilyMember | null;
}

export async function getAllMembers(adminAddress?: string): Promise<FamilyMember[]> {
  const args = adminAddress
    ? [nativeToScVal(adminAddress, { type: "string" })]
    : [];
  const native = await simulateContractRead("get_all_members", args);
  return Array.isArray(native) ? (native as FamilyMember[]) : [];
}

export async function checkSpendingLimit(
  memberId: string,
  amount: number,
): Promise<{ allowed: boolean; currentSpending: number; spendingLimit: number; remainingLimit: number }> {
  const amountStroops = BigInt(Math.round(amount * 1e7));
  const native = await simulateContractRead("check_spending_limit", [
    nativeToScVal(memberId, { type: "string" }),
    nativeToScVal(amountStroops, { type: "i128" }),
  ]);
  if (native && typeof native === "object") {
    const r = native as Partial<{
      allowed: boolean;
      current_spending: number;
      spending_limit: number;
      remaining_limit: number;
    }>;
    return {
      allowed: Boolean(r.allowed),
      currentSpending: Number(r.current_spending ?? 0),
      spendingLimit: Number(r.spending_limit ?? 0),
      remainingLimit: Number(r.remaining_limit ?? 0),
    };
  }
  return { allowed: false, currentSpending: 0, spendingLimit: 0, remainingLimit: 0 };
}
