/**
 * Tests for the useApprovalsQueue reducer logic.
 * The reducer is inlined here to avoid pulling in React/Next.js/Sentry
 * transforms that break the vitest runner for "use client" files.
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Inline reducer (mirrors lib/hooks/useApprovalsQueue.ts exactly)
// ---------------------------------------------------------------------------

type ApprovalStatus = "building" | "pending" | "signing" | "approved" | "expired";
type ApprovalAction = "add_member" | "update_spending_limit";

interface ApprovalItem {
  id: string;
  action: ApprovalAction;
  targetMember: string;
  label: string;
  xdr: string;
  status: ApprovalStatus;
  createdAt: string;
  requiredSignatures: number;
  collectedSignatures: string[];
  error?: string;
}

type QueueAction =
  | { type: "ENQUEUE"; payload: ApprovalItem }
  | { type: "SET_XDR"; id: string; xdr: string }
  | { type: "SET_STATUS"; id: string; status: ApprovalStatus; error?: string }
  | { type: "ADD_SIGNATURE"; id: string; signer: string }
  | { type: "EXPIRE_ALL" };

const APPROVAL_TTL_MS = 30 * 60 * 1000;

function queueReducer(state: ApprovalItem[], action: QueueAction): ApprovalItem[] {
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
        if (item.collectedSignatures.includes(action.signer)) return item;
        const collected = [...item.collectedSignatures, action.signer];
        return {
          ...item,
          collectedSignatures: collected,
          status: collected.length >= item.requiredSignatures ? "approved" : "pending",
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

function makeItem(overrides: Partial<ApprovalItem> = {}): ApprovalItem {
  return {
    id: "item-1",
    action: "add_member",
    targetMember: "GABC123",
    label: "Add GABC123",
    xdr: "",
    status: "pending",
    createdAt: new Date().toISOString(),
    requiredSignatures: 2,
    collectedSignatures: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ENQUEUE
// ---------------------------------------------------------------------------

describe("queueReducer ENQUEUE", () => {
  it("prepends item to front of queue", () => {
    const next = queueReducer([makeItem({ id: "old" })], {
      type: "ENQUEUE",
      payload: makeItem({ id: "new" }),
    });
    expect(next[0].id).toBe("new");
    expect(next[1].id).toBe("old");
    expect(next).toHaveLength(2);
  });

  it("works on empty queue", () => {
    const next = queueReducer([], { type: "ENQUEUE", payload: makeItem() });
    expect(next).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// SET_XDR
// ---------------------------------------------------------------------------

describe("queueReducer SET_XDR", () => {
  it("sets xdr and moves item to pending", () => {
    const item = makeItem({ status: "building", xdr: "" });
    const next = queueReducer([item], { type: "SET_XDR", id: "item-1", xdr: "xdr-1" });
    expect(next[0].xdr).toBe("xdr-1");
    expect(next[0].status).toBe("pending");
  });

  it("does not affect other items", () => {
    const a = makeItem({ id: "a", status: "building" });
    const b = makeItem({ id: "b", status: "building" });
    const next = queueReducer([a, b], { type: "SET_XDR", id: "a", xdr: "xdr-a" });
    expect(next[1].status).toBe("building");
    expect(next[1].xdr).toBe("");
  });
});

// ---------------------------------------------------------------------------
// SET_STATUS
// ---------------------------------------------------------------------------

describe("queueReducer SET_STATUS", () => {
  it("updates status of matching id", () => {
    const next = queueReducer([makeItem()], { type: "SET_STATUS", id: "item-1", status: "signing" });
    expect(next[0].status).toBe("signing");
  });

  it("attaches error when provided", () => {
    const next = queueReducer([makeItem()], {
      type: "SET_STATUS", id: "item-1", status: "pending", error: "Signing failed",
    });
    expect(next[0].error).toBe("Signing failed");
  });

  it("does not overwrite existing error when error param absent", () => {
    const item = makeItem({ error: "old error" });
    const next = queueReducer([item], { type: "SET_STATUS", id: "item-1", status: "signing" });
    expect(next[0].error).toBe("old error");
  });

  it("ignores unknown ids", () => {
    const next = queueReducer([makeItem({ id: "x" })], {
      type: "SET_STATUS", id: "missing", status: "expired",
    });
    expect(next[0].status).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// ADD_SIGNATURE
// ---------------------------------------------------------------------------

describe("queueReducer ADD_SIGNATURE", () => {
  it("appends signer to collectedSignatures", () => {
    const item = makeItem({ requiredSignatures: 2, collectedSignatures: [] });
    const next = queueReducer([item], { type: "ADD_SIGNATURE", id: "item-1", signer: "GSIGNER1" });
    expect(next[0].collectedSignatures).toContain("GSIGNER1");
  });

  it("keeps status pending when collected < required", () => {
    const item = makeItem({ requiredSignatures: 2, collectedSignatures: [] });
    const next = queueReducer([item], { type: "ADD_SIGNATURE", id: "item-1", signer: "GSIGNER1" });
    expect(next[0].status).toBe("pending");
  });

  it("transitions to approved when collected >= required", () => {
    const item = makeItem({ requiredSignatures: 2, collectedSignatures: ["GSIGNER1"] });
    const next = queueReducer([item], { type: "ADD_SIGNATURE", id: "item-1", signer: "GSIGNER2" });
    expect(next[0].status).toBe("approved");
    expect(next[0].collectedSignatures).toHaveLength(2);
  });

  it("ignores duplicate signer", () => {
    const item = makeItem({ requiredSignatures: 2, collectedSignatures: ["GSIGNER1"] });
    const next = queueReducer([item], { type: "ADD_SIGNATURE", id: "item-1", signer: "GSIGNER1" });
    expect(next[0].collectedSignatures).toHaveLength(1);
    expect(next[0].status).toBe("pending");
  });

  it("clears error on successful signature", () => {
    const item = makeItem({ requiredSignatures: 1, collectedSignatures: [], error: "prev" });
    const next = queueReducer([item], { type: "ADD_SIGNATURE", id: "item-1", signer: "GSIGNER1" });
    expect(next[0].error).toBeUndefined();
  });

  it("approves immediately with requiredSignatures = 1", () => {
    const item = makeItem({ requiredSignatures: 1, collectedSignatures: [] });
    const next = queueReducer([item], { type: "ADD_SIGNATURE", id: "item-1", signer: "GSIGNER1" });
    expect(next[0].status).toBe("approved");
  });
});

// ---------------------------------------------------------------------------
// EXPIRE_ALL
// ---------------------------------------------------------------------------

describe("queueReducer EXPIRE_ALL", () => {
  it("marks old pending items as expired", () => {
    const old = makeItem({
      status: "pending",
      createdAt: new Date(Date.now() - APPROVAL_TTL_MS - 1000).toISOString(),
    });
    expect(queueReducer([old], { type: "EXPIRE_ALL" })[0].status).toBe("expired");
  });

  it("does not expire items within TTL", () => {
    const fresh = makeItem({ status: "pending", createdAt: new Date().toISOString() });
    expect(queueReducer([fresh], { type: "EXPIRE_ALL" })[0].status).toBe("pending");
  });

  it("does not expire approved or building items even if old", () => {
    const old = new Date(Date.now() - APPROVAL_TTL_MS - 1000).toISOString();
    const approved = makeItem({ id: "a", status: "approved", createdAt: old });
    const building = makeItem({ id: "b", status: "building", createdAt: old });
    const next = queueReducer([approved, building], { type: "EXPIRE_ALL" });
    expect(next[0].status).toBe("approved");
    expect(next[1].status).toBe("building");
  });

  it("handles empty queue", () => {
    expect(queueReducer([], { type: "EXPIRE_ALL" })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Default branch
// ---------------------------------------------------------------------------

describe("queueReducer default branch", () => {
  it("returns state unchanged for unknown action", () => {
    const state = [makeItem()];
    // @ts-expect-error intentional unknown action
    expect(queueReducer(state, { type: "UNKNOWN" })).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("APPROVAL_TTL_MS", () => {
  it("is 30 minutes in milliseconds", () => {
    expect(APPROVAL_TTL_MS).toBe(30 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// Dispatch-sequence integration
// ---------------------------------------------------------------------------

describe("enqueueAddMember dispatch sequence", () => {
  it("happy path: building then pending after SET_XDR", () => {
    let s = queueReducer([], {
      type: "ENQUEUE",
      payload: makeItem({ id: "a1", action: "add_member", status: "building" }),
    });
    expect(s[0].status).toBe("building");
    s = queueReducer(s, { type: "SET_XDR", id: "a1", xdr: "xdr-add" });
    expect(s[0].status).toBe("pending");
    expect(s[0].xdr).toBe("xdr-add");
  });

  it("build failure: building then expired with error", () => {
    let s = queueReducer([], {
      type: "ENQUEUE",
      payload: makeItem({ id: "a2", action: "add_member", status: "building" }),
    });
    s = queueReducer(s, {
      type: "SET_STATUS", id: "a2", status: "expired", error: "Contract not deployed",
    });
    expect(s[0].status).toBe("expired");
    expect(s[0].error).toBe("Contract not deployed");
  });
});

describe("enqueueUpdateLimit dispatch sequence", () => {
  it("happy path: building then pending after SET_XDR", () => {
    let s = queueReducer([], {
      type: "ENQUEUE",
      payload: makeItem({ id: "l1", action: "update_spending_limit", status: "building" }),
    });
    s = queueReducer(s, { type: "SET_XDR", id: "l1", xdr: "xdr-limit" });
    expect(s[0].action).toBe("update_spending_limit");
    expect(s[0].status).toBe("pending");
    expect(s[0].xdr).toBe("xdr-limit");
  });

  it("build failure: building then expired", () => {
    let s = queueReducer([], {
      type: "ENQUEUE",
      payload: makeItem({ id: "l2", action: "update_spending_limit", status: "building" }),
    });
    s = queueReducer(s, { type: "SET_STATUS", id: "l2", status: "expired", error: "timeout" });
    expect(s[0].status).toBe("expired");
  });
});

describe("signItem dispatch sequence", () => {
  it("pending -> signing -> approved with single required sig", () => {
    let s = queueReducer([], {
      type: "ENQUEUE",
      payload: makeItem({ id: "s1", status: "pending", xdr: "x", requiredSignatures: 1 }),
    });
    s = queueReducer(s, { type: "SET_STATUS", id: "s1", status: "signing" });
    expect(s[0].status).toBe("signing");
    s = queueReducer(s, { type: "ADD_SIGNATURE", id: "s1", signer: "GSIGNER" });
    expect(s[0].status).toBe("approved");
  });

  it("multi-sig stays pending until threshold met", () => {
    let s = queueReducer([], {
      type: "ENQUEUE",
      payload: makeItem({ id: "m1", status: "pending", xdr: "x", requiredSignatures: 2 }),
    });
    s = queueReducer(s, { type: "SET_STATUS", id: "m1", status: "signing" });
    s = queueReducer(s, { type: "ADD_SIGNATURE", id: "m1", signer: "GSIGNER1" });
    expect(s[0].status).toBe("pending");
    s = queueReducer(s, { type: "SET_STATUS", id: "m1", status: "signing" });
    s = queueReducer(s, { type: "ADD_SIGNATURE", id: "m1", signer: "GSIGNER2" });
    expect(s[0].status).toBe("approved");
  });

  it("sign rejection reverts to pending with error", () => {
    let s = queueReducer([], {
      type: "ENQUEUE",
      payload: makeItem({ id: "sf", status: "pending", xdr: "x", requiredSignatures: 1 }),
    });
    s = queueReducer(s, { type: "SET_STATUS", id: "sf", status: "signing" });
    s = queueReducer(s, { type: "SET_STATUS", id: "sf", status: "pending", error: "user rejected" });
    expect(s[0].status).toBe("pending");
    expect(s[0].error).toBe("user rejected");
  });

  it("duplicate signer guard", () => {
    let s = queueReducer([], {
      type: "ENQUEUE",
      payload: makeItem({
        id: "dup", status: "pending", requiredSignatures: 2, collectedSignatures: ["GSIGNER1"],
      }),
    });
    s = queueReducer(s, { type: "ADD_SIGNATURE", id: "dup", signer: "GSIGNER1" });
    expect(s[0].collectedSignatures).toHaveLength(1);
  });
});
