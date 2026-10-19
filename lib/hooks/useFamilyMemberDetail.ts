"use client";

import { useCallback, useReducer, type Dispatch } from "react";
import { apiClient } from "@/lib/client/apiClient";
import { validateSpendingLimit } from "@/lib/validation/family-limits";
import type { CheckSpendingLimitResponse, FamilyMember } from "@/utils/types/family-wallet.types";

interface SpendingLimitSnapshot {
  spendingLimit: number | null;
  currentSpending: number | null;
  remainingLimit: number | null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemberDetailState {
  member: FamilyMember | null;
  limit: SpendingLimitSnapshot | null;
  checkResult: CheckSpendingLimitResponse | null;
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  /** Pending optimistic spending-limit value while a PATCH is in-flight */
  pendingLimit: number | null;
  saving: boolean;
  saveError: string | null;
}

type Action =
  | { type: "FETCH_START" }
  | {
      type: "FETCH_SUCCESS";
      member: FamilyMember | null;
      limit: SpendingLimitSnapshot | null;
      check: CheckSpendingLimitResponse | null;
      unavailable?: boolean;
    }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "SAVE_START"; optimisticLimit: number }
  | { type: "SAVE_SUCCESS"; newLimit: number; limit: SpendingLimitSnapshot | null }
  | { type: "SAVE_ERROR"; error: string; rolledBackLimit: number };

type MemberDetailDispatch = Dispatch<Action>;

const initialState: MemberDetailState = {
  member: null,
  limit: null,
  checkResult: null,
  loading: false,
  error: null,
  unavailable: false,
  pendingLimit: null,
  saving: false,
  saveError: null,
};

function reducer(state: MemberDetailState, action: Action): MemberDetailState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null, unavailable: false };
    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        member: action.member ?? state.member,
        limit: action.limit,
        checkResult: action.check,
        unavailable: action.unavailable ?? false,
        pendingLimit: null,
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.error };
    case "SAVE_START":
      return { ...state, saving: true, saveError: null, pendingLimit: action.optimisticLimit };
    case "SAVE_SUCCESS":
      return {
        ...state,
        saving: false,
        pendingLimit: null,
        limit: action.limit ?? state.limit,
        member: state.member ? { ...state.member, spendingLimit: action.newLimit } : state.member,
      };
    case "SAVE_ERROR":
      return {
        ...state,
        saving: false,
        saveError: action.error,
        pendingLimit: null,
        member: state.member
          ? { ...state.member, spendingLimit: action.rolledBackLimit }
          : state.member,
      };
    default:
      return state;
  }
}

export const _initialState: MemberDetailState = initialState;
export { reducer as _reducer };
// ---------------------------------------------------------------------------

function isContractUnavailable(response: Response | null): boolean {
  return response?.status === 501;
}

async function readJson<T>(response: Response | null): Promise<T | null> {
  if (!response?.ok) return null;
  return response.json() as Promise<T>;
}

function normalizeLimitSnapshot(payload: unknown): SpendingLimitSnapshot | null {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;
  const nested = (data.limit ?? data.member) as unknown;

  if (typeof nested === "number") {
    return { spendingLimit: nested, currentSpending: null, remainingLimit: null };
  }

  const source = nested && typeof nested === "object"
    ? { ...data, ...(nested as Record<string, unknown>) }
    : data;

  const spendingLimit = typeof source.spendingLimit === "number"
    ? source.spendingLimit
    : typeof source.limit === "number"
      ? source.limit
      : null;
  const currentSpending = typeof source.currentSpending === "number" ? source.currentSpending : null;
  const remainingLimit = typeof source.remainingLimit === "number" ? source.remainingLimit : null;

  if (spendingLimit === null && currentSpending === null && remainingLimit === null) {
    return null;
  }

  return { spendingLimit, currentSpending, remainingLimit };
}

function normalizeMember(payload: unknown): FamilyMember | null {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;
  const source = data.member && typeof data.member === "object"
    ? data.member as Record<string, unknown>
    : data;

  if (
    typeof source.id !== "string" ||
    typeof source.address !== "string" ||
    typeof source.role !== "string" ||
    typeof source.spendingLimit !== "number"
  ) {
    return null;
  }

  return source as unknown as FamilyMember;
}

export interface FamilyMemberDetailPayload {
  member: FamilyMember | null;
  limit: SpendingLimitSnapshot | null;
  check: CheckSpendingLimitResponse | null;
  unavailable: boolean;
}

export async function fetchFamilyMemberDetail(memberId: string): Promise<FamilyMemberDetailPayload> {
  const [memberRes, limitRes, checkRes] = await Promise.all([
    apiClient.get(`/api/family/members/${memberId}`),
    apiClient.get(`/api/family/members/${memberId}/limit`),
    apiClient.get(`/api/family/members/${memberId}/check?amount=0`),
  ]);

  if (!memberRes || memberRes.status === 404) {
    throw new Error("member_not_found");
  }

  const unavailable = [memberRes, limitRes, checkRes].some(isContractUnavailable);
  if (!memberRes.ok && !unavailable) {
    throw new Error("fetch_failed");
  }

  const member = normalizeMember(await readJson<unknown>(memberRes));
  const limitData = await readJson<unknown>(limitRes);
  const check = await readJson<CheckSpendingLimitResponse>(checkRes);
  const limit = normalizeLimitSnapshot(limitData) ?? normalizeLimitSnapshot(check) ?? null;

  return { member, limit, check, unavailable };
}

export async function saveFamilyMemberLimit(
  memberId: string,
  newLimit: number,
  previous: Pick<MemberDetailState, "limit" | "checkResult">
): Promise<SpendingLimitSnapshot> {
  const res = await apiClient.request(`/api/family/members/${memberId}/limit`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit: newLimit }),
  });

  if (!res?.ok) {
    throw new Error("save_failed");
  }

  return normalizeLimitSnapshot(await readJson<unknown>(res)) ?? {
    spendingLimit: newLimit,
    currentSpending: previous.limit?.currentSpending ?? previous.checkResult?.currentSpending ?? null,
    remainingLimit:
      typeof previous.limit?.currentSpending === "number"
        ? newLimit - previous.limit.currentSpending
        : typeof previous.checkResult?.currentSpending === "number"
          ? newLimit - previous.checkResult.currentSpending
          : null,
  };
}

export async function runFamilyMemberDetailFetch(
  memberId: string | null,
  dispatch: MemberDetailDispatch
): Promise<void> {
  if (!memberId) return;
  dispatch({ type: "FETCH_START" });

  try {
    const detail = await fetchFamilyMemberDetail(memberId);
    dispatch({ type: "FETCH_SUCCESS", ...detail });
  } catch (error) {
    dispatch({
      type: "FETCH_ERROR",
      error: error instanceof Error && error.message === "member_not_found"
        ? "member_not_found"
        : "fetch_failed",
    });
  }
}

export async function runFamilyMemberLimitUpdate(
  memberId: string | null,
  state: MemberDetailState,
  dispatch: MemberDetailDispatch,
  newLimit: number
): Promise<boolean> {
  if (!memberId) return false;

  const validation = validateSpendingLimit(newLimit);
  if (!validation.isValid) {
    dispatch({
      type: "SAVE_ERROR",
      error: validation.error ?? "invalid_limit",
      rolledBackLimit: state.member?.spendingLimit ?? state.limit?.spendingLimit ?? 0,
    });
    return false;
  }

  const previousLimit = state.member?.spendingLimit ?? state.limit?.spendingLimit ?? 0;
  dispatch({ type: "SAVE_START", optimisticLimit: newLimit });

  try {
    const savedLimit = await saveFamilyMemberLimit(memberId, newLimit, state);
    dispatch({ type: "SAVE_SUCCESS", newLimit: savedLimit.spendingLimit ?? newLimit, limit: savedLimit });
    return true;
  } catch {
    dispatch({ type: "SAVE_ERROR", error: "save_failed", rolledBackLimit: previousLimit });
    return false;
  }
}

/**
 * Data hook that fetches a family member detail from three endpoints:
 * - GET /api/family/members/[id]
 * - GET /api/family/members/[id]/limit
 * - GET /api/family/members/[id]/check?amount=0
 * - PATCH /api/family/members/[id]/limit (for edits)
 *
 * Handles optimistic updates for the spending limit with automatic rollback on failure.
 */
export function useFamilyMemberDetail(memberId: string | null) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetch = useCallback(async () => {
    await runFamilyMemberDetailFetch(memberId, dispatch);
  }, [memberId]);

  const updateLimit = useCallback(
    async (newLimit: number): Promise<boolean> => {
      return runFamilyMemberLimitUpdate(memberId, state, dispatch, newLimit);
    },
    [memberId, state]
  );

  return { state, fetch, updateLimit };
}
