import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names and drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("resolves conflicting Tailwind utilities by keeping the last one", () => {
    // Plain string concatenation (e.g. clsx alone) would emit both
    // "px-2" and "px-4" side by side, and whichever rule wins depends on
    // CSS source order rather than the caller's intent -- a classic
    // "why isn't my override working" bug this guards against.
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
