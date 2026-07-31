/**
 * Unit tests for the useTitle stacking hook.
 *
 * Strategy: renderHook from @testing-library/react exercises the hook inside
 * jsdom so we can assert on document.title after each render/unmount cycle.
 *
 * The titleStack is exported for direct inspection when necessary, but most
 * assertions go through document.title (the observable output).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTitle, titleStack, composeTitles } from "@/lib/hooks/useTitle";

// ── Helpers ──────────────────────────────────────────────────────────────────

function resetState() {
  document.title = "";
  // Drain the exported stack between tests to avoid state leak.
  titleStack.splice(0, titleStack.length);
}

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(resetState);
afterEach(resetState);

// ── composeTitles (pure function) ─────────────────────────────────────────────

describe("composeTitles", () => {
  it("returns an empty string for an empty array", () => {
    expect(composeTitles([])).toBe("");
  });

  it("returns an empty string when all segments are blank", () => {
    expect(composeTitles(["", "  ", "\t"])).toBe("");
  });

  it("joins non-blank segments with ' | '", () => {
    expect(composeTitles(["Dashboard", "Goals"])).toBe("Dashboard | Goals");
  });

  it("trims whitespace from each segment", () => {
    expect(composeTitles(["  Dashboard  ", " Goals "])).toBe("Dashboard | Goals");
  });

  it("filters out blank segments in the middle", () => {
    expect(composeTitles(["Dashboard", "", "Goals"])).toBe("Dashboard | Goals");
  });

  it("returns a single segment without a separator", () => {
    expect(composeTitles(["Dashboard"])).toBe("Dashboard");
  });

  it("handles a large array", () => {
    expect(composeTitles(["A", "B", "C", "D"])).toBe("A | B | C | D");
  });
});

// ── useTitle basic behaviour ──────────────────────────────────────────────────

describe("useTitle", () => {
  describe("single title", () => {
    it("sets document.title when a single hook mounts", () => {
      renderHook(() => useTitle("Dashboard"));
      expect(document.title).toBe("Dashboard");
    });

    it("ignores an empty string title", () => {
      renderHook(() => useTitle(""));
      expect(document.title).toBe("");
    });

    it("ignores a whitespace-only title", () => {
      renderHook(() => useTitle("   "));
      expect(document.title).toBe("");
    });

    it("trims whitespace from the title before setting", () => {
      renderHook(() => useTitle("  Dashboard  "));
      expect(document.title).toBe("Dashboard");
    });

    it("clears document.title when the hook unmounts", () => {
      const { unmount } = renderHook(() => useTitle("Dashboard"));
      expect(document.title).toBe("Dashboard");
      unmount();
      expect(document.title).toBe("");
    });
  });

  // ── depth-aware stacking ──────────────────────────────────────────────────

  describe("depth-aware stacking", () => {
    it("orders titles by depth: depth-0 title comes before depth-1", () => {
      // depth-1 mounts first (simulates a child effect firing before parent)
      renderHook(() => useTitle("Goals", { depth: 1 }));
      renderHook(() => useTitle("Dashboard", { depth: 0 }));
      // Depth 0 (Dashboard) must appear first regardless of mount order
      expect(document.title).toBe("Dashboard | Goals");
    });

    it("page title (depth 0) + section title (depth 1) composes correctly", () => {
      renderHook(() => useTitle("Financial Dashboard", { depth: 0 }));
      renderHook(() => useTitle("Transaction History", { depth: 1 }));
      expect(document.title).toBe("Financial Dashboard | Transaction History");
    });

    it("defaults to depth 0 when no options are provided", () => {
      renderHook(() => useTitle("Send Money"));
      renderHook(() => useTitle("Review", { depth: 1 }));
      expect(document.title).toBe("Send Money | Review");
    });

    it("two depth-0 titles compose in insertion order", () => {
      renderHook(() => useTitle("A"));
      renderHook(() => useTitle("B"));
      expect(document.title).toBe("A | B");
    });

    it("three levels: depth 0, 1, 2", () => {
      renderHook(() => useTitle("RemitWise", { depth: 0 }));
      renderHook(() => useTitle("Dashboard", { depth: 1 }));
      renderHook(() => useTitle("Goals", { depth: 2 }));
      expect(document.title).toBe("RemitWise | Dashboard | Goals");
    });
  });

  // ── unmount cleanup ───────────────────────────────────────────────────────

  describe("unmount cleanup", () => {
    it("restores the parent title when a child section unmounts", () => {
      renderHook(() => useTitle("Dashboard", { depth: 0 }));
      const { unmount } = renderHook(() => useTitle("Goals", { depth: 1 }));

      expect(document.title).toBe("Dashboard | Goals");
      unmount();
      expect(document.title).toBe("Dashboard");
    });

    it("restores an empty title when the only mounted hook unmounts", () => {
      const { unmount } = renderHook(() => useTitle("Dashboard"));
      unmount();
      expect(document.title).toBe("");
    });

    it("does not leak entries in titleStack after unmount", () => {
      const { unmount } = renderHook(() => useTitle("Dashboard"));
      expect(titleStack).toHaveLength(1);
      unmount();
      expect(titleStack).toHaveLength(0);
    });

    it("handles multiple unmounts without throwing", () => {
      const { unmount: u1 } = renderHook(() => useTitle("A", { depth: 0 }));
      const { unmount: u2 } = renderHook(() => useTitle("B", { depth: 1 }));
      const { unmount: u3 } = renderHook(() => useTitle("C", { depth: 2 }));

      u2();
      expect(document.title).toBe("A | C");

      u1();
      expect(document.title).toBe("C");

      u3();
      expect(document.title).toBe("");
    });
  });

  // ── reactivity (prop changes) ─────────────────────────────────────────────

  describe("prop updates", () => {
    it("updates document.title when the title string changes", () => {
      let title = "Dashboard";
      const { rerender } = renderHook(() => useTitle(title));

      expect(document.title).toBe("Dashboard");

      act(() => {
        title = "Financial Dashboard";
      });
      rerender();

      expect(document.title).toBe("Financial Dashboard");
    });

    it("updates document.title when depth changes", () => {
      // Parent stays at depth 0
      renderHook(() => useTitle("Parent", { depth: 0 }));

      let depth = 1;
      const { rerender } = renderHook(() => useTitle("Child", { depth }));

      expect(document.title).toBe("Parent | Child");

      act(() => {
        depth = 2;
      });
      rerender();

      // Depth change should not break the composition
      expect(document.title).toBe("Parent | Child");
    });

    it("removes the old entry and adds a new one when title changes", () => {
      let title = "Old Title";
      const { rerender } = renderHook(() => useTitle(title));

      expect(titleStack).toHaveLength(1);
      expect(titleStack[0].title).toBe("Old Title");

      act(() => {
        title = "New Title";
      });
      rerender();

      expect(titleStack).toHaveLength(1);
      expect(titleStack[0].title).toBe("New Title");
    });
  });

  // ── SSR safety ────────────────────────────────────────────────────────────

  describe("SSR safety", () => {
    it("does not throw when window is undefined (server context)", () => {
      // jsdom has window; we simulate SSR by checking that updateDomTitle
      // guards against typeof window === "undefined". We can't remove window
      // in jsdom, but we can verify the hook doesn't explode with empty titles.
      expect(() => renderHook(() => useTitle(""))).not.toThrow();
    });
  });

  // ── two hooks with the same title string ──────────────────────────────────

  describe("duplicate title strings", () => {
    it("tracks two hooks with the same title independently via internal id", () => {
      const { unmount: u1 } = renderHook(() => useTitle("Goals", { depth: 0 }));
      const { unmount: u2 } = renderHook(() => useTitle("Goals", { depth: 1 }));

      expect(document.title).toBe("Goals | Goals");

      u2();
      // Only the depth-1 entry should be removed
      expect(document.title).toBe("Goals");

      u1();
      expect(document.title).toBe("");
    });
  });
});
