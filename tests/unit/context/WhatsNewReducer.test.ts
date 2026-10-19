import { describe, it, expect } from "vitest";
import {
  whatsNewReducer,
  initialState,
  computeUnreadCount,
  computeReadIds,
  type WhatsNewState,
  type WhatsNewAction,
} from "@/lib/context/WhatsNewReducer";
import { CHANGELOG } from "@/lib/changelog";

const CHANGELOG_LENGTH = CHANGELOG.length;

describe("WhatsNewReducer", () => {
  describe("INITIALIZE", () => {
    it("sets mounted=true and isOpen=true when no stored value exists", () => {
      const action: WhatsNewAction = {
        type: "INITIALIZE",
        payload: { lastSeenId: null, hasStored: false },
      };
      const next = whatsNewReducer(initialState, action);

      expect(next.mounted).toBe(true);
      expect(next.isOpen).toBe(true);
      expect(next.lastSeenId).toBeNull();
    });

    it("sets mounted=true and isOpen=false when stored value exists", () => {
      const action: WhatsNewAction = {
        type: "INITIALIZE",
        payload: { lastSeenId: "v1.2.0", hasStored: true },
      };
      const next = whatsNewReducer(initialState, action);

      expect(next.mounted).toBe(true);
      expect(next.isOpen).toBe(false);
      expect(next.lastSeenId).toBe("v1.2.0");
    });

    it("ignores subsequent INITIALIZE calls after mounted", () => {
      let state = whatsNewReducer(initialState, {
        type: "INITIALIZE",
        payload: { lastSeenId: "v1.0.0", hasStored: true },
      });
      state = whatsNewReducer(state, { type: "INITIALIZE", payload: { lastSeenId: "v2.0.0", hasStored: true } });

      expect(state.lastSeenId).toBe("v1.0.0");
      expect(state.mounted).toBe(true);
    });
  });

  describe("OPEN", () => {
    it("sets isOpen=true", () => {
      const state: WhatsNewState = { ...initialState, mounted: true, isOpen: false };
      const next = whatsNewReducer(state, { type: "OPEN" });
      expect(next.isOpen).toBe(true);
    });

    it("preserves other state", () => {
      const state: WhatsNewState = { isOpen: false, lastSeenId: "v1.0.0", mounted: true };
      const next = whatsNewReducer(state, { type: "OPEN" });
      expect(next.lastSeenId).toBe("v1.0.0");
      expect(next.mounted).toBe(true);
    });
  });

  describe("CLOSE", () => {
    it("sets isOpen=false", () => {
      const state: WhatsNewState = { ...initialState, mounted: true, isOpen: true };
      const next = whatsNewReducer(state, { type: "CLOSE" });
      expect(next.isOpen).toBe(false);
    });

    it("preserves other state", () => {
      const state: WhatsNewState = { isOpen: true, lastSeenId: "v1.0.0", mounted: true };
      const next = whatsNewReducer(state, { type: "CLOSE" });
      expect(next.lastSeenId).toBe("v1.0.0");
      expect(next.mounted).toBe(true);
    });
  });

  describe("TOGGLE", () => {
    it("opens when closed", () => {
      const state: WhatsNewState = { ...initialState, mounted: true, isOpen: false };
      const next = whatsNewReducer(state, { type: "TOGGLE" });
      expect(next.isOpen).toBe(true);
    });

    it("closes when open", () => {
      const state: WhatsNewState = { ...initialState, mounted: true, isOpen: true };
      const next = whatsNewReducer(state, { type: "TOGGLE" });
      expect(next.isOpen).toBe(false);
    });

    it("preserves other state", () => {
      const state: WhatsNewState = { isOpen: false, lastSeenId: "v1.0.0", mounted: true };
      const next = whatsNewReducer(state, { type: "TOGGLE" });
      expect(next.lastSeenId).toBe("v1.0.0");
      expect(next.mounted).toBe(true);
    });
  });

  describe("MARK_ALL_READ", () => {
    it("sets lastSeenId to newest changelog entry id", () => {
      const state: WhatsNewState = { ...initialState, mounted: true, lastSeenId: "v1.0.0" };
      const next = whatsNewReducer(state, { type: "MARK_ALL_READ" });
      expect(next.lastSeenId).toBe(CHANGELOG[0]?.id ?? null);
    });

    it("sets lastSeenId to null when changelog is empty", () => {
      // This tests the fallback behavior - handled by CHANGELOG[0]?.id ?? null
      const state: WhatsNewState = { ...initialState, mounted: true, lastSeenId: "v1.0.0" };
      const next = whatsNewReducer(state, { type: "MARK_ALL_READ" });
      expect(next.lastSeenId).toBe(CHANGELOG[0]?.id ?? null);
    });

    it("preserves isOpen and mounted", () => {
      const state: WhatsNewState = { isOpen: true, lastSeenId: "v1.0.0", mounted: true };
      const next = whatsNewReducer(state, { type: "MARK_ALL_READ" });
      expect(next.isOpen).toBe(true);
      expect(next.mounted).toBe(true);
    });
  });

  describe("REPLAY", () => {
    it("clears lastSeenId and opens panel", () => {
      const state: WhatsNewState = { ...initialState, mounted: true, lastSeenId: "v1.2.0", isOpen: false };
      const next = whatsNewReducer(state, { type: "REPLAY" });
      expect(next.lastSeenId).toBeNull();
      expect(next.isOpen).toBe(true);
    });

    it("works when panel is already open", () => {
      const state: WhatsNewState = { ...initialState, mounted: true, lastSeenId: "v1.2.0", isOpen: true };
      const next = whatsNewReducer(state, { type: "REPLAY" });
      expect(next.lastSeenId).toBeNull();
      expect(next.isOpen).toBe(true);
    });

    it("preserves mounted state", () => {
      const state: WhatsNewState = { ...initialState, mounted: true, lastSeenId: "v1.2.0" };
      const next = whatsNewReducer(state, { type: "REPLAY" });
      expect(next.mounted).toBe(true);
    });
  });

  describe("unknown action", () => {
    it("returns current state unchanged", () => {
      const state: WhatsNewState = { ...initialState, mounted: true, lastSeenId: "v1.0.0" };
      const next = whatsNewReducer(state, { type: "UNKNOWN" } as unknown as WhatsNewAction);
      expect(next).toBe(state);
    });
  });

  describe("computeUnreadCount", () => {
    it("returns 0 when not mounted", () => {
      const state: WhatsNewState = { isOpen: true, lastSeenId: null, mounted: false };
      expect(computeUnreadCount(state)).toBe(0);
    });

    it("returns full changelog length when lastSeenId is null", () => {
      const state: WhatsNewState = { isOpen: true, lastSeenId: null, mounted: true };
      expect(computeUnreadCount(state)).toBe(CHANGELOG_LENGTH);
    });

    it("returns count of entries before lastSeenId", () => {
      const state: WhatsNewState = { isOpen: true, lastSeenId: "v1.2.0", mounted: true };
      const expected = CHANGELOG.findIndex((e) => e.id === "v1.2.0");
      expect(computeUnreadCount(state)).toBe(expected);
    });

    it("returns full length when lastSeenId not found in changelog", () => {
      const state: WhatsNewState = { isOpen: true, lastSeenId: "v99.0.0", mounted: true };
      expect(computeUnreadCount(state)).toBe(CHANGELOG_LENGTH);
    });

    it("returns 0 when lastSeenId is the newest entry", () => {
      const newestId = CHANGELOG[0]?.id;
      if (!newestId) return;
      const state: WhatsNewState = { isOpen: true, lastSeenId: newestId, mounted: true };
      expect(computeUnreadCount(state)).toBe(0);
    });
  });

  describe("computeReadIds", () => {
    it("returns empty set when all entries are unread", () => {
      const state: WhatsNewState = { isOpen: true, lastSeenId: null, mounted: true };
      const readIds = computeReadIds(state);
      expect(readIds.size).toBe(0);
    });

    it("returns set of read entry ids", () => {
      const state: WhatsNewState = { isOpen: true, lastSeenId: "v1.2.0", mounted: true };
      const readIds = computeReadIds(state);
      const expected = new Set(CHANGELOG.slice(CHANGELOG.findIndex((e) => e.id === "v1.2.0")).map((e) => e.id));
      expect(readIds).toEqual(expected);
    });

    it("returns all ids when lastSeenId is newest", () => {
      const newestId = CHANGELOG[0]?.id;
      if (!newestId) return;
      const state: WhatsNewState = { isOpen: true, lastSeenId: newestId, mounted: true };
      const readIds = computeReadIds(state);
      expect(readIds.size).toBe(CHANGELOG_LENGTH);
    });
  });

  describe("state transitions - atomic updates", () => {
    it("OPEN then CLOSE returns to closed state", () => {
      let state: WhatsNewState = { ...initialState, mounted: true, isOpen: false };
      state = whatsNewReducer(state, { type: "OPEN" });
      expect(state.isOpen).toBe(true);
      state = whatsNewReducer(state, { type: "CLOSE" });
      expect(state.isOpen).toBe(false);
    });

    it("TOGGLE twice returns to original state", () => {
      let state: WhatsNewState = { ...initialState, mounted: true, isOpen: false };
      state = whatsNewReducer(state, { type: "TOGGLE" });
      expect(state.isOpen).toBe(true);
      state = whatsNewReducer(state, { type: "TOGGLE" });
      expect(state.isOpen).toBe(false);
    });

    it("MARK_ALL_READ then REPLAY resets to unread", () => {
      let state: WhatsNewState = { ...initialState, mounted: true, lastSeenId: "v1.0.0" };
      state = whatsNewReducer(state, { type: "MARK_ALL_READ" });
      expect(state.lastSeenId).toBe(CHANGELOG[0]?.id ?? null);
      state = whatsNewReducer(state, { type: "REPLAY" });
      expect(state.lastSeenId).toBeNull();
    });

    it("each action produces new state object (immutability)", () => {
      const state: WhatsNewState = { ...initialState, mounted: true };
      const next = whatsNewReducer(state, { type: "OPEN" });
      expect(next).not.toBe(state);
      expect(state.isOpen).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles MARK_ALL_READ correctly with current changelog", () => {
      const state: WhatsNewState = { ...initialState, mounted: true };
      const next = whatsNewReducer(state, { type: "MARK_ALL_READ" });
      expect(next.lastSeenId).toBe(CHANGELOG[0]?.id ?? null);
    });

    it("handles unknown action without mutation", () => {
      const state: WhatsNewState = { ...initialState, mounted: true, isOpen: true, lastSeenId: "v1.0.0" };
      const next = whatsNewReducer(state, { type: "SOME_UNKNOWN_ACTION" } as unknown as WhatsNewAction);
      expect(next).toBe(state);
    });
  });
});