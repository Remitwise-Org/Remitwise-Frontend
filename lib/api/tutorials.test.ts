import { afterEach, describe, expect, it, vi } from "vitest";
import { getTutorialProgress, saveTutorialProgress } from "./tutorials";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getTutorialProgress", () => {
  it("fetches and returns the parsed progress", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ chapters: { "0": { checkpoints: [true] } } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getTutorialProgress("tut-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/tutorials/tut-1/progress");
    expect(result).toEqual({ chapters: { "0": { checkpoints: [true] } } });
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));
    await expect(getTutorialProgress("tut-1")).rejects.toThrow("Server request failed");
  });
});

describe("saveTutorialProgress", () => {
  it("PUTs the progress and returns the parsed response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ chapters: { "0": { checkpoints: [true] } } }));
    vi.stubGlobal("fetch", fetchMock);

    const progress = { chapters: { "0": { checkpoints: [true] } } };
    const result = await saveTutorialProgress("tut-1", progress);

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/tutorials/tut-1/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(progress),
    });
    expect(result).toEqual(progress);
  });

  it("returns null (does not throw) on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));
    const result = await saveTutorialProgress("tut-1", { chapters: {} });
    expect(result).toBeNull();
  });

  it("returns null (does not throw) on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await saveTutorialProgress("tut-1", { chapters: {} });
    expect(result).toBeNull();
  });
});
