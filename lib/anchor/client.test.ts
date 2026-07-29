import { describe, it, expect } from "vitest";
import { sanitizeAnchorUrl } from "./client";

describe("sanitizeAnchorUrl", () => {
  it("passes through a valid https URL", () => {
    expect(sanitizeAnchorUrl("https://anchor.example.com/sep24/interactive")).toBe(
      "https://anchor.example.com/sep24/interactive"
    );
  });

  it("passes through a valid http URL", () => {
    expect(sanitizeAnchorUrl("http://anchor.example.com/flow")).toBe(
      "http://anchor.example.com/flow"
    );
  });

  it("rejects a javascript: URL", () => {
    expect(sanitizeAnchorUrl("javascript:alert(document.cookie)")).toBeUndefined();
  });

  it("rejects a data: URL", () => {
    expect(sanitizeAnchorUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
  });

  it("rejects a malformed URL string", () => {
    expect(sanitizeAnchorUrl("not a url")).toBeUndefined();
  });

  it("rejects non-string input", () => {
    expect(sanitizeAnchorUrl(undefined)).toBeUndefined();
    expect(sanitizeAnchorUrl(null)).toBeUndefined();
    expect(sanitizeAnchorUrl(123)).toBeUndefined();
  });
});
