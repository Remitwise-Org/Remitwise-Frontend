import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getSessionId", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates and persists a session ID in sessionStorage on first call", async () => {
    const { getSessionId } = await import("../../lib/client/sessionId");
    const id = getSessionId();

    expect(id).toMatch(/^sess-[a-z0-9]+-[a-z0-9]+$/);
    expect(window.sessionStorage.getItem("rw_session_id")).toBe(id);
  });

  it("returns the same ID on repeated calls within the same module instance", async () => {
    const { getSessionId } = await import("../../lib/client/sessionId");
    expect(getSessionId()).toBe(getSessionId());
  });

  it("reuses the sessionStorage value across a fresh module load (survives reload)", async () => {
    const first = await import("../../lib/client/sessionId");
    const id = first.getSessionId();

    vi.resetModules();
    const second = await import("../../lib/client/sessionId");
    expect(second.getSessionId()).toBe(id);
  });

  it("falls back to an in-memory ID when sessionStorage throws", async () => {
    const getItemSpy = vi
      .spyOn(window.sessionStorage.__proto__, "getItem")
      .mockImplementation(() => {
        throw new Error("storage disabled");
      });

    const { getSessionId } = await import("../../lib/client/sessionId");
    const id = getSessionId();

    expect(id).toMatch(/^sess-/);
    getItemSpy.mockRestore();
  });
});
