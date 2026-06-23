import { Contract, scValToNative, nativeToScVal, SorobanRpc } from "@stellar/stellar-sdk";
import { getSorobanClient } from "../soroban-client";
import { resolveContractId } from "./network-resolution";
import { ContractReadError } from "./dashboard-aggregate";
export { ContractReadError };

const server = getSorobanClient();

const RPC_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

async function withRetry<T>(
  label: string,
  promiseFactory: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

    try {
      return await Promise.race([
        promiseFactory(),
        new Promise<never>((_, reject) =>
          controller.signal.addEventListener("abort", () =>
            reject(
              new Error(
                `RPC call "${label}" timed out after ${RPC_TIMEOUT_MS} ms`,
              ),
            ),
          ),
        ),
      ]);
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

function getContractId(): string {
  return resolveContractId("SAVINGS_GOALS");
}

function getContract(): Contract {
  return new Contract(getContractId());
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: number;
  locked: boolean;
}

function mapToGoal(id: string, rawData: any): SavingsGoal {
  return {
    id,
    name: rawData.name?.toString() || "Unnamed Goal",
    targetAmount: Number(rawData.target_amount) || 0,
    currentAmount: Number(rawData.current_amount) || 0,
    targetDate: Number(rawData.target_date) || 0,
    locked: !!rawData.locked,
  };
}

export async function getGoal(goalId: string): Promise<SavingsGoal | null> {
  const contractId = getContractId();
  try {
    const result = await withRetry("getGoal", () =>
      server.getContractData(
        contractId,
        nativeToScVal(goalId),
        SorobanRpc.Durability.Persistent,
      ),
    );

    if (!result) return null;

    const scVal = result.val.contractData().val();

    return mapToGoal(goalId, scValToNative(scVal));
  } catch (err) {
    if (err instanceof ContractReadError) throw err;
    throw new ContractReadError(contractId, "getGoal", err);
  }
}

export async function getAllGoals(owner: string): Promise<SavingsGoal[]> {
  const contractId = getContractId();
  try {
    const contract = new Contract(contractId);
    const operation = contract.call(
      "get_all_goals",
      nativeToScVal(owner),
    );

    const response = await withRetry("getAllGoals", () =>
      server.simulateTransaction(operation as any),
    );

    if (!("result" in response)) {
      throw new ContractReadError(
        contractId,
        "getAllGoals",
        (response as any).error ?? "Simulation failed",
      );
    }

    const result = response.result;

    if (!result || !result.retval) {
      throw new ContractReadError(
        contractId,
        "getAllGoals",
        "No return value in simulation",
      );
    }

    const rawGoals = scValToNative(result.retval);

    if (typeof rawGoals !== "object" || rawGoals === null) {
      throw new ContractReadError(
        contractId,
        "getAllGoals",
        `Unexpected return type: ${typeof rawGoals}`,
      );
    }

    return Object.entries(rawGoals).map(([id, data]) =>
      mapToGoal(id, data),
    );
  } catch (err) {
    if (err instanceof ContractReadError) throw err;
    throw new ContractReadError(contractId, "getAllGoals", err);
  }
}

export async function isGoalCompleted(goalId: string): Promise<boolean> {
  const goal = await getGoal(goalId);

  if (!goal) return false;

  return goal.currentAmount >= goal.targetAmount;
}