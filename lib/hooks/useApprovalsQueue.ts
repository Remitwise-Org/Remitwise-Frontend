"use client";

import { useCallback, useReducer } from "react";
import { buildAddMemberTx, buildUpdateSpendingLimitTx } from "@/lib/contracts/family-wallet";
import type { FamilyMemberRole } from "@/utils/types/family-wallet.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApprovalStatus = "building" | "pending" | "signing" | "approved" | "expired";

export type ApprovalAction = "add_member" | "update_spending_limit";

export interface ApprovalItem {
  id: string;
  action: ApprovalAction;
  /** Stellar address or member ID of the target */
  targetMember: string;
  /** Human-readable label shown in the queue */
  label: string;
  /** Unsigned transaction XDR produced by the build helpers */
  xdr: string;
  status: ApprovalStatus;
  createdAt: string;
  requiredSignatures: number;
  collectedSignatures: string[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type QueueAction =
  | { type: "ENQUEUE"; payload: ApprovalItem }
  | { type: "SET_XDR"; id: string; xdr: string }
  | { type: "SET_STATUS"; id: string; status: ApprovalStatus; error?: string }
  | { type: "ADD_SIGNATURE"; id: string; signer: string }
  | { type: "EXPIRE_ALL" };

/** 30 minutes before an unacted-on approval is considered expired */
export const APPROVAL_TTL_MS = 30 * 60 * 1000;

export function queueReducer(state: ApprovalItem[], action: QueueAction): ApprovalItem[] {
  switch (action.type) {
    case "ENQUEUE":
      return [action.payload, ...state];

    case "SET_XDR":
      return state.map((item) =>
        item.id === action.id ? { ...item, xdr: action.xdr, status: "pending" } : item
      );

    case "SET_STATUS":
      return state.map((item) =>
        item.id === action.id
          ? { ...item, status: action.status, ...(action.error ? { error: action.error } : {}) }
          : item
      );

    case "ADD_SIGNATURE": {
      return state.map((item) => {
        if (item.id !== action.id) return item;
        // Idempotent — ignore duplicate signer
        if (item.collectedSignatures.includes(action.signer)) return item;
        const collected = [...item.collectedSignatures, action.signer];
        const approved = collected.length >= item.requiredSignatures;
        return {
          ...item,
          collectedSignatures: collected,
          status: approved ? "approved" : "pending",
          error: undefined,
        };
      });
    }

    case "EXPIRE_ALL": {
      const cutoff = Date.now() - APPROVAL_TTL_MS;
      return state.map((item) =>
        item.status === "pending" && new Date(item.createdAt).getTime() < cutoff
          ? { ...item, status: "expired" }
          : item
      );
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

export interface EnqueueAddMemberParams {
  adminAddress: string;
  memberAddress: string;
  role: FamilyMemberRole;
  spendingLimit: number;
  requiredSignatures?: number;
}

export interface EnqueueUpdateLimitParams {
  callerAddress: string;
  memberId: string;
  newLimit: number;
  requiredSignatures?: number;
}

export interface UseApprovalsQueueReturn {
  queue: ApprovalItem[];
  enqueueAddMember: (params: EnqueueAddMemberParams) => Promise<void>;
  enqueueUpdateLimit: (params: EnqueueUpdateLimitParams) => Promise<void>;
  /**
   * Sign a pending item.
   * `signXdr` should invoke the wallet-kit sign method and return the signed XDR.
   */
  signItem: (
    id: string,
    signerAddress: string,
    signXdr: (xdr: string) => Promise<string>
  ) => Promise<void>;
  /** Mark any items older than APPROVAL_TTL_MS as expired */
  expireStale: () => void;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * useApprovalsQueue
 *
 * Client-side pending-approvals queue for family wallet member-management
 * transactions.  Transactions are built via `buildAddMemberTx` and
 * `buildUpdateSpendingLimitTx`, then signed through the wallet-kit connection
 * passed in as the `signXdr` callback on `signItem`.
 *
 * The data source is behind this hook so it can swap to an API without
 * component changes.
 */
export function useApprovalsQueue(): UseApprovalsQueueReturn {
  const [queue, dispatch] = useReducer(queueReducer, []);

  const enqueueAddMember = useCallback(
    async ({
      adminAddress,
      memberAddress,
      role,
      spendingLimit,
      requiredSignatures = 1,
    }: EnqueueAddMemberParams) => {
      const id = makeId("add");
      dispatch({
        type: "ENQUEUE",
        payload: {
          id,
          action: "add_member",
          targetMember: memberAddress,
          label: `Add ${memberAddress.slice(0, 8)}…`,
          xdr: "",
          status: "building",
          createdAt: new Date().toISOString(),
          requiredSignatures,
          collectedSignatures: [],
        },
      });

      try {
        const xdr = await buildAddMemberTx(adminAddress, memberAddress, role, spendingLimit);
        dispatch({ type: "SET_XDR", id, xdr });
      } catch (err) {
        dispatch({
          type: "SET_STATUS",
          id,
          status: "expired",
          error: err instanceof Error ? err.message : "Build failed",
        });
      }
    },
    []
  );

  const enqueueUpdateLimit = useCallback(
    async ({
      callerAddress,
      memberId,
      newLimit,
      requiredSignatures = 1,
    }: EnqueueUpdateLimitParams) => {
      const id = makeId("limit");
      dispatch({
        type: "ENQUEUE",
        payload: {
          id,
          action: "update_spending_limit",
          targetMember: memberId,
          label: `Update limit for ${memberId.slice(0, 8)}… → $${newLimit}`,
          xdr: "",
          status: "building",
          createdAt: new Date().toISOString(),
          requiredSignatures,
          collectedSignatures: [],
        },
      });

      try {
        const xdr = await buildUpdateSpendingLimitTx(callerAddress, memberId, newLimit);
        dispatch({ type: "SET_XDR", id, xdr });
      } catch (err) {
        dispatch({
          type: "SET_STATUS",
          id,
          status: "expired",
          error: err instanceof Error ? err.message : "Build failed",
        });
      }
    },
    []
  );

  const signItem = useCallback(
    async (
      id: string,
      signerAddress: string,
      signXdr: (xdr: string) => Promise<string>
    ) => {
      const item = queue.find((i) => i.id === id);
      if (!item || item.status !== "pending") return;
      if (item.collectedSignatures.includes(signerAddress)) return;

      dispatch({ type: "SET_STATUS", id, status: "signing" });
      try {
        await signXdr(item.xdr);
        dispatch({ type: "ADD_SIGNATURE", id, signer: signerAddress });
      } catch (err) {
        // Revert to pending so the user can retry
        dispatch({
          type: "SET_STATUS",
          id,
          status: "pending",
          error: err instanceof Error ? err.message : "Signing failed",
        });
      }
    },
    [queue]
  );

  const expireStale = useCallback(() => {
    dispatch({ type: "EXPIRE_ALL" });
  }, []);

  return { queue, enqueueAddMember, enqueueUpdateLimit, signItem, expireStale };
}
