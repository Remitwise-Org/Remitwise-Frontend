import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import fc from "fast-check";
import { useTitle, titleStack, composeTitles } from "@/lib/hooks/useTitle";

// Helper to reset the DOM and module state
function resetDom() {
  document.title = "";
  titleStack.length = 0; // mutate to clear
}

beforeEach(resetDom);
afterEach(resetDom);

describe("useTitle stacking behaviour", () => {
  it("composes_pure_title_arrays_correctly", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (titles) => {
        const result = composeTitles(titles);
        const valid = titles.map(t => t?.trim()).filter(Boolean);
        
        if (valid.length === 0) {
          expect(result).toBe("");
        } else {
          expect(result).toBe(valid.join(" | "));
        }
      })
    );
  });

  it("updates_document_title_when_multiple_hooks_mount_and_unmount", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }), (titles) => {
        resetDom();
        
        const hooks = titles.map((t) => renderHook(() => useTitle(t)));
        
        const expectedComposed = titles.map(t => t.trim()).filter(Boolean).join(" | ");
        expect(document.title).toBe(expectedComposed);
        
        // Unmount them in random order? For deterministic, unmount them in reverse order
        // simulating normal React unmount (child unmounts first? Actually, parents unmounting unmounts children too).
        // Let's just unmount one by one and check the title.
        hooks.forEach((hook, i) => {
          hook.unmount();
          const remaining = titles.slice(i + 1).map(t => t.trim()).filter(Boolean);
          const expectedRemaining = remaining.length > 0 ? remaining.join(" | ") : "";
          expect(document.title).toBe(expectedRemaining);
        });
      })
    );
  });

  it("ignores_empty_or_whitespace_titles", () => {
    resetDom();
    const { unmount } = renderHook(() => useTitle("   "));
    expect(document.title).toBe("");
    unmount();
  });
});