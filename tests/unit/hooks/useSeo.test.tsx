/**
 * Tests for the useSeo hook.
 *
 * Strategy: renderHook from @testing-library/react exercises the hook in a
 * jsdom environment, which provides a real document.title and document.head,
 * so we can assert on DOM state after each render/unmount cycle.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSeo } from "@/lib/hooks/useSeo";
import { DEFAULT_SEO } from "@/lib/config/seo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMetaDescription(): string | null {
  return (
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute("content") ?? null
  );
}

function countMetaDescriptionTags(): number {
  return document.querySelectorAll('meta[name="description"]').length;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset to a clean slate before every test
  document.title = "";
  document
    .querySelectorAll('meta[name="description"]')
    .forEach((el) => el.remove());
});

afterEach(() => {
  document.title = "";
  document
    .querySelectorAll('meta[name="description"]')
    .forEach((el) => el.remove());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSeo", () => {
  describe("title management", () => {
    it("sets document.title to the provided title", () => {
      renderHook(() =>
        useSeo({ title: "My Page | RemitWise", description: "Desc" })
      );
      expect(document.title).toBe("My Page | RemitWise");
    });

    it("falls back to DEFAULT_SEO.title when no title is provided", () => {
      renderHook(() => useSeo({ description: "A description" }));
      expect(document.title).toBe(DEFAULT_SEO.title);
    });

    it("falls back to DEFAULT_SEO.title when called with no arguments", () => {
      renderHook(() => useSeo());
      expect(document.title).toBe(DEFAULT_SEO.title);
    });

    it("updates document.title when the title prop changes", () => {
      let title = "First Title";
      const { rerender } = renderHook(() => useSeo({ title }));
      expect(document.title).toBe("First Title");

      title = "Second Title";
      rerender();
      expect(document.title).toBe("Second Title");
    });
  });

  describe("meta description management", () => {
    it("creates a meta[name='description'] tag with the provided description", () => {
      renderHook(() =>
        useSeo({ title: "Page", description: "Custom description" })
      );
      expect(getMetaDescription()).toBe("Custom description");
    });

    it("falls back to DEFAULT_SEO.description when no description is provided", () => {
      renderHook(() => useSeo({ title: "Page" }));
      expect(getMetaDescription()).toBe(DEFAULT_SEO.description);
    });

    it("does NOT create duplicate meta[name='description'] tags", () => {
      // First hook call
      renderHook(() =>
        useSeo({ title: "Page A", description: "Description A" })
      );
      // Second hook call (simulates a navigation without unmounting the first)
      renderHook(() =>
        useSeo({ title: "Page B", description: "Description B" })
      );

      expect(countMetaDescriptionTags()).toBe(1);
    });

    it("reuses an existing meta[name='description'] tag", () => {
      // Pre-insert a meta tag (as a server-rendered layout might do)
      const existingMeta = document.createElement("meta");
      existingMeta.setAttribute("name", "description");
      existingMeta.setAttribute("content", "Server-rendered description");
      document.head.appendChild(existingMeta);

      renderHook(() =>
        useSeo({ title: "Page", description: "Client description" })
      );

      expect(countMetaDescriptionTags()).toBe(1);
      expect(getMetaDescription()).toBe("Client description");
    });
  });

  describe("stack-based cleanup on unmount", () => {
    it("restores DEFAULT_SEO after the component unmounts", () => {
      // Establish a baseline with defaults
      const { unmount: unmountDefault } = renderHook(() => useSeo());

      // Mount a page-specific SEO override
      const { unmount: unmountPage } = renderHook(() =>
        useSeo({ title: "Specific Page", description: "Specific description" })
      );

      expect(document.title).toBe("Specific Page");

      // Unmount the page-specific component
      unmountPage();

      // Title should revert to the default-level entry
      expect(document.title).toBe(DEFAULT_SEO.title);
      expect(getMetaDescription()).toBe(DEFAULT_SEO.description);

      unmountDefault();
    });

    it("restores DEFAULT_SEO after unmounting when no parent hook exists", () => {
      const { unmount } = renderHook(() =>
        useSeo({ title: "Temporary Page", description: "Temporary desc" })
      );

      expect(document.title).toBe("Temporary Page");

      unmount();

      // Stack is empty → falls back to DEFAULT_SEO
      expect(document.title).toBe(DEFAULT_SEO.title);
    });
  });

  describe("navigation metadata updates", () => {
    it("updates both title and description when props change (simulated navigation)", () => {
      let title = "Dashboard | RemitWise";
      let description = "Your financial dashboard";

      const { rerender } = renderHook(() => useSeo({ title, description }));

      expect(document.title).toBe("Dashboard | RemitWise");
      expect(getMetaDescription()).toBe("Your financial dashboard");

      // Simulate navigation to a different route by changing props
      title = "Send Money | RemitWise";
      description = "Send money to your family quickly and securely";
      rerender();

      expect(document.title).toBe("Send Money | RemitWise");
      expect(getMetaDescription()).toBe(
        "Send money to your family quickly and securely"
      );
    });
  });

  describe("default metadata behavior", () => {
    it("DEFAULT_SEO has a non-empty title", () => {
      expect(DEFAULT_SEO.title).toBeTruthy();
    });

    it("DEFAULT_SEO has a non-empty description", () => {
      expect(DEFAULT_SEO.description).toBeTruthy();
    });

    it("uses DEFAULT_SEO values when useSeo is called with an empty object", () => {
      renderHook(() => useSeo({}));
      expect(document.title).toBe(DEFAULT_SEO.title);
      expect(getMetaDescription()).toBe(DEFAULT_SEO.description);
    });
  });
});
