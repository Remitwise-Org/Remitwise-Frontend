import { describe, it, expect } from "vitest";
import { stripHtml, sanitizePastedValue } from "@/lib/validation/sanitizePaste";

describe("stripHtml", () => {
  it("removes HTML tags, keeping the text content", () => {
    expect(stripHtml("<b>Hello</b> world")).toBe("Hello world");
  });

  it("strips a script tag down to its (inert, unexecuted) text content", () => {
    // A stripped tag's text content becomes plain text in a textarea --
    // "alert(1)" here can never execute, it's just visible characters.
    expect(stripHtml("<script>alert(1)</script>")).toBe("alert(1)");
  });

  it("leaves plain text untouched", () => {
    expect(stripHtml("Just a normal description.")).toBe("Just a normal description.");
  });

  it("collapses runs of horizontal whitespace left behind by stripped tags", () => {
    expect(stripHtml("Hello<div>   </div>world")).toBe("Hello world");
  });

  it("collapses excessive blank lines to at most one", () => {
    expect(stripHtml("Line one\n\n\n\nLine two")).toBe("Line one\n\nLine two");
  });

  it("trims leading and trailing whitespace", () => {
    expect(stripHtml("  <p>padded</p>  ")).toBe("padded");
  });
});

describe("sanitizePastedValue", () => {
  function clipboardWith(plainText: string): DataTransfer {
    return {
      getData: (type: string) => (type === "text/plain" ? plainText : ""),
    } as unknown as DataTransfer;
  }

  it("splices sanitized pasted text in at the cursor position", () => {
    const result = sanitizePastedValue(
      clipboardWith("<b>pasted</b>"),
      "before  after",
      "before ".length,
      "before ".length
    );

    expect(result).toBe("before pasted after");
  });

  it("replaces a selected range rather than just inserting", () => {
    const result = sanitizePastedValue(clipboardWith("NEW"), "old text here", 0, 3);

    expect(result).toBe("NEW text here");
  });
});
