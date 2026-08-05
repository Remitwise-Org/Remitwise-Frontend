import { describe, it, expect } from "vitest";
// @ts-expect-error -- plain JS script, no type declarations
import { formatPreviewComment } from "../../../scripts/format-preview-comment.mjs";

describe("formatPreviewComment", () => {
  it("formats the preview url and short commit sha", () => {
    const body = formatPreviewComment({
      url: "https://remitwise-frontend-pr-123.vercel.app",
      sha: "abcdef1234567890",
    });

    expect(body).toContain("https://remitwise-frontend-pr-123.vercel.app");
    expect(body).toContain("`abcdef1`");
  });

  it("omits the commit line when no sha is given", () => {
    const body = formatPreviewComment({ url: "https://example.vercel.app" });

    expect(body).toContain("https://example.vercel.app");
    expect(body).not.toContain("**Commit:**");
  });

  it("throws when no url is provided", () => {
    expect(() => formatPreviewComment({ sha: "abcdef1" })).toThrow(
      /url is required/
    );
  });
});
