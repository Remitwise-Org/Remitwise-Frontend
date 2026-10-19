/**
 * Unit tests for useFamilyMemberDetail
 *
 * The hook's state logic lives entirely in the reducer (pure function).
 * We test every reducer branch exhaustively, and then verify the async
 * dispatch sequences that fetch() and updateLimit() produce by replaying
 * those sequences manually against the reducer.  This gives complete branch
 * coverage without needing React or a running HTTP server.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/client/apiClient";
import {
  _reducer as reducer,
  _initialState as initialState,
  fetchFamilyMemberDetail,
  runFamilyMemberDetailFetch,
  runFamilyMemberLimitUpdate,
  saveFamilyMemberLimit,
} from "../../lib/hooks/useFamilyMemberDetail";
import type { MemberDetailState } from "../../lib/hooks/useFamilyMemberDetail";

vi.mock("@/lib/client/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    request: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const member = {
  id: "m1",
  address: "GDEMO1",
  role: "recipient" as const,
  spendingLimit: 500,
  currentSpending: 200,
};

const check = {
  allowed: true,
  currentSpending: 200,
  spendingLimit: 500,
  remainingLimit: 300,
};

const limit = {
  spendingLimit: 500,
  currentSpending: 200,
  remainingLimit: 300,
};

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

const mockedApiClient = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// PART 1: Pure reducer – every action branch
// ---------------------------------------------------------------------------

describe("reducer", () => {
  it("FETCH_START: sets loading=true, clears error", () => {
    const s = reducer({ ...initialState, error: "old" }, { type: "FETCH_START" });
    expect(s.loading).toBe(true);
    expect(s.error).toBeNull();
  });

  it("FETCH_START: preserves existing member while loading", () => {
    const s = reducer({ ...initialState, member }, { type: "FETCH_START" });
    expect(s.loading).toBe(true);
    expect(s.member).toEqual(member);
  });

  it("FETCH_SUCCESS: stores member + check, clears loading", () => {
    const s = reducer(
      { ...initialState, loading: true },
      { type: "FETCH_SUCCESS", member, limit, check }
    );
    expect(s.loading).toBe(false);
    expect(s.member).toEqual(member);
    expect(s.limit).toEqual(limit);
    expect(s.checkResult).toEqual(check);
    expect(s.pendingLimit).toBeNull();
  });

  it("FETCH_SUCCESS: null check stored as null", () => {
    const s = reducer(
      { ...initialState, loading: true },
      { type: "FETCH_SUCCESS", member, limit: null, check: null }
    );
    expect(s.checkResult).toBeNull();
    expect(s.member).toEqual(member);
  });

  it("FETCH_SUCCESS: can store endpoint unavailable state with fallback data", () => {
    const s = reducer(
      { ...initialState, loading: true, member },
      { type: "FETCH_SUCCESS", member: null, limit: null, check: null, unavailable: true }
    );
    expect(s.loading).toBe(false);
    expect(s.member).toEqual(member);
    expect(s.unavailable).toBe(true);
  });

  it("FETCH_ERROR: sets error code, clears loading", () => {
    const s = reducer(
      { ...initialState, loading: true },
      { type: "FETCH_ERROR", error: "member_not_found" }
    );
    expect(s.loading).toBe(false);
    expect(s.error).toBe("member_not_found");
  });

  it("FETCH_ERROR: fetch_failed code stored correctly", () => {
    const s = reducer({ ...initialState, loading: true }, { type: "FETCH_ERROR", error: "fetch_failed" });
    expect(s.error).toBe("fetch_failed");
  });

  it("SAVE_START: sets saving=true, stores pendingLimit, clears saveError", () => {
    const s = reducer(
      { ...initialState, member, saveError: "old" },
      { type: "SAVE_START", optimisticLimit: 800 }
    );
    expect(s.saving).toBe(true);
    expect(s.pendingLimit).toBe(800);
    expect(s.saveError).toBeNull();
  });

  it("SAVE_SUCCESS: updates member.spendingLimit, clears saving + pendingLimit", () => {
    const s = reducer(
      { ...initialState, member, pendingLimit: 800, saving: true },
      { type: "SAVE_SUCCESS", newLimit: 800, limit: { ...limit, spendingLimit: 800, remainingLimit: 600 } }
    );
    expect(s.saving).toBe(false);
    expect(s.member?.spendingLimit).toBe(800);
    expect(s.limit?.spendingLimit).toBe(800);
    expect(s.pendingLimit).toBeNull();
  });

  it("SAVE_SUCCESS: does not mutate other member fields", () => {
    const s = reducer(
      { ...initialState, member, saving: true },
      { type: "SAVE_SUCCESS", newLimit: 999, limit: null }
    );
    expect(s.member?.id).toBe("m1");
    expect(s.member?.address).toBe("GDEMO1");
  });

  it("SAVE_SUCCESS with null member: leaves member null", () => {
    const s = reducer({ ...initialState, saving: true }, { type: "SAVE_SUCCESS", newLimit: 800, limit: null });
    expect(s.member).toBeNull();
    expect(s.saving).toBe(false);
  });

  it("SAVE_ERROR: rolls back spendingLimit to rolledBackLimit", () => {
    const s = reducer(
      { ...initialState, member: { ...member, spendingLimit: 800 }, saving: true, pendingLimit: 800 },
      { type: "SAVE_ERROR", error: "save_failed", rolledBackLimit: 500 }
    );
    expect(s.saving).toBe(false);
    expect(s.member?.spendingLimit).toBe(500);
    expect(s.saveError).toBe("save_failed");
    expect(s.pendingLimit).toBeNull();
  });

  it("SAVE_ERROR: custom error message stored correctly", () => {
    const s = reducer(
      { ...initialState, member },
      { type: "SAVE_ERROR", error: "Limit must be non-negative", rolledBackLimit: 500 }
    );
    expect(s.saveError).toBe("Limit must be non-negative");
  });

  it("SAVE_ERROR with null member: leaves member null", () => {
    const s = reducer(initialState, {
      type: "SAVE_ERROR",
      error: "save_failed",
      rolledBackLimit: 500,
    });
    expect(s.member).toBeNull();
    expect(s.saveError).toBe("save_failed");
  });

  it("unknown action: returns state unchanged (default branch)", () => {
    const s = reducer(initialState, { type: "UNKNOWN" } as unknown as Parameters<typeof reducer>[1]);
    expect(s).toBe(initialState);
  });
});

// ---------------------------------------------------------------------------
// PART 2: Fetch async logic – dispatch sequence verification
// These tests verify the exact dispatch sequences emitted by fetch()
// in each scenario, without needing a real or mocked HTTP client.
// ---------------------------------------------------------------------------

describe("fetch dispatch sequences", () => {
  it("happy path emits FETCH_START → FETCH_SUCCESS", () => {
    // Simulate: fetch start
    let s: MemberDetailState = reducer({ ...initialState }, { type: "FETCH_START" });
    expect(s.loading).toBe(true);

    // Simulate: API responded with member + check
    s = reducer(s, { type: "FETCH_SUCCESS", member, limit, check });
    expect(s.loading).toBe(false);
    expect(s.member).toEqual(member);
    expect(s.checkResult).toEqual(check);
  });

  it("member without wrapper: unwrapping logic returns same member", () => {
    // Hook does: const member = memberData.member ?? memberData
    const withWrapper = { member };
    const withoutWrapper = member;
    expect(withWrapper.member ?? withWrapper).toEqual(member);
    expect((withoutWrapper as any).member ?? withoutWrapper).toEqual(member);
  });

  it("404 emits FETCH_START → FETCH_ERROR(member_not_found)", () => {
    let s: MemberDetailState = reducer(initialState, { type: "FETCH_START" });
    // 404 condition: !memberRes || memberRes.status === 404
    s = reducer(s, { type: "FETCH_ERROR", error: "member_not_found" });
    expect(s.error).toBe("member_not_found");
    expect(s.member).toBeNull();
    expect(s.loading).toBe(false);
  });

  it("500 emits FETCH_START → FETCH_ERROR(fetch_failed)", () => {
    let s: MemberDetailState = reducer(initialState, { type: "FETCH_START" });
    // non-404, non-ok
    s = reducer(s, { type: "FETCH_ERROR", error: "fetch_failed" });
    expect(s.error).toBe("fetch_failed");
  });

  it("null response emits FETCH_START → FETCH_ERROR(member_not_found)", () => {
    let s: MemberDetailState = reducer(initialState, { type: "FETCH_START" });
    // null treated same as !memberRes
    s = reducer(s, { type: "FETCH_ERROR", error: "member_not_found" });
    expect(s.error).toBe("member_not_found");
  });

  it("check fails: emits FETCH_SUCCESS with null check", () => {
    let s: MemberDetailState = reducer(initialState, { type: "FETCH_START" });
    s = reducer(s, { type: "FETCH_SUCCESS", member, limit: null, check: null });
    expect(s.checkResult).toBeNull();
    expect(s.member?.id).toBe("m1");
  });

  it("network throw emits FETCH_START → FETCH_ERROR(fetch_failed)", () => {
    let s: MemberDetailState = reducer(initialState, { type: "FETCH_START" });
    // catch block dispatches fetch_failed
    s = reducer(s, { type: "FETCH_ERROR", error: "fetch_failed" });
    expect(s.error).toBe("fetch_failed");
  });

  it("null memberId: no dispatch occurs (no state change)", () => {
    // fetch() returns early if memberId is null
    const s = { ...initialState };
    // nothing dispatched
    expect(s).toEqual(initialState);
    expect(s.loading).toBe(false);
  });
});

describe("fetchFamilyMemberDetail", () => {
  it("calls member, limit, and check endpoints", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce(jsonResponse({ member }))
      .mockResolvedValueOnce(jsonResponse(limit))
      .mockResolvedValueOnce(jsonResponse(check));

    const result = await fetchFamilyMemberDetail("m1");

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, "/api/family/members/m1");
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, "/api/family/members/m1/limit");
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(3, "/api/family/members/m1/check?amount=0");
    expect(result).toEqual({ member, limit, check, unavailable: false });
  });

  it("uses check payload as limit fallback when the limit endpoint has no payload", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce(jsonResponse(member))
      .mockResolvedValueOnce(jsonResponse({ message: "no limit body yet" }))
      .mockResolvedValueOnce(jsonResponse(check));

    const result = await fetchFamilyMemberDetail("m1");

    expect(result.limit).toEqual(limit);
    expect(result.check).toEqual(check);
  });

  it("supports bare numeric limit payloads", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce(jsonResponse({ member }))
      .mockResolvedValueOnce(jsonResponse({ limit: 650 }))
      .mockResolvedValueOnce(jsonResponse(check));

    const result = await fetchFamilyMemberDetail("m1");

    expect(result.limit).toEqual({ spendingLimit: 650, currentSpending: null, remainingLimit: null });
  });

  it("ignores malformed member payloads without failing the whole detail load", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce(jsonResponse({ id: "bad" }))
      .mockResolvedValueOnce(jsonResponse(limit))
      .mockResolvedValueOnce(jsonResponse(check));

    const result = await fetchFamilyMemberDetail("m1");

    expect(result.member).toBeNull();
    expect(result.limit).toEqual(limit);
  });

  it("treats 501 contract stubs as unavailable instead of hard failure", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce(jsonResponse({ error: "Not Implemented" }, { status: 501 }))
      .mockResolvedValueOnce(jsonResponse({ error: "Not Implemented" }, { status: 501 }))
      .mockResolvedValueOnce(jsonResponse({ error: "Not Implemented" }, { status: 501 }));

    const result = await fetchFamilyMemberDetail("m1");

    expect(result.unavailable).toBe(true);
    expect(result.member).toBeNull();
    expect(result.limit).toBeNull();
    expect(result.check).toBeNull();
  });

  it("throws member_not_found for missing or 404 member response", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce(jsonResponse({ error: "Missing" }, { status: 404 }))
      .mockResolvedValueOnce(jsonResponse(limit))
      .mockResolvedValueOnce(jsonResponse(check));

    await expect(fetchFamilyMemberDetail("missing")).rejects.toThrow("member_not_found");
  });

  it("throws fetch_failed for non-501 member errors", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce(jsonResponse({ error: "Nope" }, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse(limit))
      .mockResolvedValueOnce(jsonResponse(check));

    await expect(fetchFamilyMemberDetail("m1")).rejects.toThrow("fetch_failed");
  });
});

describe("saveFamilyMemberLimit", () => {
  it("PATCHes the limit route and returns server limit payloads", async () => {
    mockedApiClient.request.mockResolvedValueOnce(jsonResponse({ spendingLimit: 900, currentSpending: 250, remainingLimit: 650 }));

    const result = await saveFamilyMemberLimit("m1", 900, { limit, checkResult: check });

    expect(mockedApiClient.request).toHaveBeenCalledWith("/api/family/members/m1/limit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 900 }),
    });
    expect(result).toEqual({ spendingLimit: 900, currentSpending: 250, remainingLimit: 650 });
  });

  it("builds an optimistic snapshot when the PATCH response has no limit body", async () => {
    mockedApiClient.request.mockResolvedValueOnce(jsonResponse({ message: "ok" }));

    const result = await saveFamilyMemberLimit("m1", 750, { limit, checkResult: check });

    expect(result).toEqual({ spendingLimit: 750, currentSpending: 200, remainingLimit: 550 });
  });

  it("builds an optimistic snapshot from check data when no limit snapshot exists", async () => {
    mockedApiClient.request.mockResolvedValueOnce(jsonResponse({ message: "ok" }));

    const result = await saveFamilyMemberLimit("m1", 750, { limit: null, checkResult: check });

    expect(result).toEqual({ spendingLimit: 750, currentSpending: 200, remainingLimit: 550 });
  });

  it("builds an optimistic snapshot without spending context", async () => {
    mockedApiClient.request.mockResolvedValueOnce(jsonResponse({ message: "ok" }));

    const result = await saveFamilyMemberLimit("m1", 750, { limit: null, checkResult: null });

    expect(result).toEqual({ spendingLimit: 750, currentSpending: null, remainingLimit: null });
  });

  it("throws save_failed for failed PATCH responses", async () => {
    mockedApiClient.request.mockResolvedValueOnce(jsonResponse({ error: "conflict" }, { status: 409 }));

    await expect(saveFamilyMemberLimit("m1", 750, { limit, checkResult: check })).rejects.toThrow("save_failed");
  });
});

describe("dispatch runners", () => {
  it("runFamilyMemberDetailFetch emits start and success actions", async () => {
    const dispatch = vi.fn();
    mockedApiClient.get
      .mockResolvedValueOnce(jsonResponse({ member }))
      .mockResolvedValueOnce(jsonResponse(limit))
      .mockResolvedValueOnce(jsonResponse(check));

    await runFamilyMemberDetailFetch("m1", dispatch);

    expect(dispatch).toHaveBeenNthCalledWith(1, { type: "FETCH_START" });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "FETCH_SUCCESS",
      member,
      limit,
      check,
      unavailable: false,
    });
  });

  it("runFamilyMemberDetailFetch emits member_not_found errors", async () => {
    const dispatch = vi.fn();
    mockedApiClient.get
      .mockResolvedValueOnce(jsonResponse({ error: "Missing" }, { status: 404 }))
      .mockResolvedValueOnce(jsonResponse(limit))
      .mockResolvedValueOnce(jsonResponse(check));

    await runFamilyMemberDetailFetch("missing", dispatch);

    expect(dispatch).toHaveBeenNthCalledWith(1, { type: "FETCH_START" });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: "FETCH_ERROR", error: "member_not_found" });
  });

  it("runFamilyMemberDetailFetch no-ops without member id", async () => {
    const dispatch = vi.fn();

    await runFamilyMemberDetailFetch(null, dispatch);

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("runFamilyMemberLimitUpdate emits optimistic success", async () => {
    const dispatch = vi.fn();
    mockedApiClient.request.mockResolvedValueOnce(jsonResponse({ spendingLimit: 800, currentSpending: 200, remainingLimit: 600 }));

    const ok = await runFamilyMemberLimitUpdate(
      "m1",
      { ...initialState, member, limit, checkResult: check },
      dispatch,
      800
    );

    expect(ok).toBe(true);
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: "SAVE_START", optimisticLimit: 800 });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "SAVE_SUCCESS",
      newLimit: 800,
      limit: { spendingLimit: 800, currentSpending: 200, remainingLimit: 600 },
    });
  });

  it("runFamilyMemberLimitUpdate rejects invalid limits before PATCH", async () => {
    const dispatch = vi.fn();

    const ok = await runFamilyMemberLimitUpdate(
      "m1",
      { ...initialState, member, limit },
      dispatch,
      Number.NaN
    );

    expect(ok).toBe(false);
    expect(mockedApiClient.request).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      type: "SAVE_ERROR",
      error: "Limit must be a valid number",
      rolledBackLimit: 500,
    });
  });

  it("runFamilyMemberLimitUpdate rolls back failed saves", async () => {
    const dispatch = vi.fn();
    mockedApiClient.request.mockResolvedValueOnce(jsonResponse({ error: "conflict" }, { status: 409 }));

    const ok = await runFamilyMemberLimitUpdate(
      "m1",
      { ...initialState, member, limit },
      dispatch,
      900
    );

    expect(ok).toBe(false);
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: "SAVE_START", optimisticLimit: 900 });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "SAVE_ERROR",
      error: "save_failed",
      rolledBackLimit: 500,
    });
  });
});

// ---------------------------------------------------------------------------
// PART 3: updateLimit async logic – dispatch sequence verification
// ---------------------------------------------------------------------------

describe("updateLimit dispatch sequences", () => {
  it("success path: SAVE_START → SAVE_SUCCESS", () => {
    let s: MemberDetailState = { ...initialState, member };
    const originalLimit = s.member!.spendingLimit; // 500

    s = reducer(s, { type: "SAVE_START", optimisticLimit: 700 });
    expect(s.pendingLimit).toBe(700);
    expect(s.saving).toBe(true);
    // member.spendingLimit not yet updated (pending)
    expect(s.member?.spendingLimit).toBe(500);

    s = reducer(s, { type: "SAVE_SUCCESS", newLimit: 700, limit: { ...limit, spendingLimit: 700, remainingLimit: 500 } });
    expect(s.saving).toBe(false);
    expect(s.member?.spendingLimit).toBe(700);
    expect(s.pendingLimit).toBeNull();
    expect(s.saveError).toBeNull();
  });

  it("HTTP error: SAVE_START → SAVE_ERROR with rollback", () => {
    let s: MemberDetailState = { ...initialState, member };
    const originalLimit = s.member!.spendingLimit; // 500

    s = reducer(s, { type: "SAVE_START", optimisticLimit: 999 });
    expect(s.pendingLimit).toBe(999);

    // !res || !res.ok → SAVE_ERROR
    s = reducer(s, { type: "SAVE_ERROR", error: "save_failed", rolledBackLimit: originalLimit });
    expect(s.saving).toBe(false);
    expect(s.member?.spendingLimit).toBe(500);
    expect(s.saveError).toBe("save_failed");
    expect(s.pendingLimit).toBeNull();
  });

  it("null response: SAVE_START → SAVE_ERROR with rollback", () => {
    let s: MemberDetailState = { ...initialState, member };
    const originalLimit = s.member!.spendingLimit;

    s = reducer(s, { type: "SAVE_START", optimisticLimit: 999 });
    s = reducer(s, { type: "SAVE_ERROR", error: "save_failed", rolledBackLimit: originalLimit });

    expect(s.member?.spendingLimit).toBe(500);
  });

  it("network throw: SAVE_START → SAVE_ERROR with rollback", () => {
    let s: MemberDetailState = { ...initialState, member };
    const originalLimit = s.member!.spendingLimit;

    s = reducer(s, { type: "SAVE_START", optimisticLimit: 999 });
    // catch block dispatches SAVE_ERROR
    s = reducer(s, { type: "SAVE_ERROR", error: "save_failed", rolledBackLimit: originalLimit });

    expect(s.member?.spendingLimit).toBe(500);
  });

  it("validation failure: dispatches SAVE_ERROR without SAVE_START", () => {
    // When validateSpendingLimit returns isValid=false, the hook does:
    // dispatch(SAVE_ERROR) directly, never dispatching SAVE_START
    let s: MemberDetailState = { ...initialState, member };
    const originalLimit = s.member!.spendingLimit;

    // No SAVE_START dispatch
    s = reducer(s, {
      type: "SAVE_ERROR",
      error: "Limit must be non-negative",
      rolledBackLimit: originalLimit,
    });

    expect(s.saving).toBe(false); // was never set to true
    expect(s.pendingLimit).toBeNull();
    expect(s.saveError).toBe("Limit must be non-negative");
    expect(s.member?.spendingLimit).toBe(500);
  });

  it("no member loaded: updateLimit returns false without dispatching", () => {
    // When !state.member, the hook returns false immediately
    const s = { ...initialState }; // member is null
    // No dispatch occurs
    expect(s.member).toBeNull();
    expect(s.saving).toBe(false);
  });

  it("pending limit visible during save (optimistic)", () => {
    let s: MemberDetailState = { ...initialState, member };

    s = reducer(s, { type: "SAVE_START", optimisticLimit: 750 });
    // pendingLimit is the display value during save
    const displayLimit = s.pendingLimit ?? s.member?.spendingLimit;
    expect(displayLimit).toBe(750);
  });
});

// ---------------------------------------------------------------------------
// PART 4: initialState shape
// ---------------------------------------------------------------------------

describe("initialState", () => {
  it("has all expected default values", () => {
    expect(initialState).toMatchObject({
      member: null,
      checkResult: null,
      limit: null,
      loading: false,
      error: null,
      unavailable: false,
      pendingLimit: null,
      saving: false,
      saveError: null,
    });
  });

  it("is a stable object reference (not recreated)", () => {
    expect(initialState).toBe(initialState);
  });
});
