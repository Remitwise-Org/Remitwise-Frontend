import { afterEach, describe, expect, it } from "vitest";
import { getAuthIssuerUrl } from "./auth";

describe("getAuthIssuerUrl", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("prefers NEXT_PUBLIC_AUTH_ISSUER_URL when set", () => {
    process.env.NEXT_PUBLIC_AUTH_ISSUER_URL = "https://issuer.example.com/auth";
    process.env.STELLAR_WEB_AUTH_ENDPOINT = "https://legacy.example.com/auth";
    expect(getAuthIssuerUrl()).toBe("https://issuer.example.com/auth");
  });

  it("falls back to STELLAR_WEB_AUTH_ENDPOINT when the public var is unset", () => {
    delete process.env.NEXT_PUBLIC_AUTH_ISSUER_URL;
    process.env.STELLAR_WEB_AUTH_ENDPOINT = "https://legacy.example.com/auth";
    expect(getAuthIssuerUrl()).toBe("https://legacy.example.com/auth");
  });

  it("derives a sane default from NEXT_PUBLIC_APP_URL when nothing is set", () => {
    delete process.env.NEXT_PUBLIC_AUTH_ISSUER_URL;
    delete process.env.STELLAR_WEB_AUTH_ENDPOINT;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.remitwise.com/";
    expect(getAuthIssuerUrl()).toBe("https://app.remitwise.com/api/auth");
  });

  it("falls back to localhost when no env vars are set at all", () => {
    delete process.env.NEXT_PUBLIC_AUTH_ISSUER_URL;
    delete process.env.STELLAR_WEB_AUTH_ENDPOINT;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAuthIssuerUrl()).toBe("http://localhost:3000/api/auth");
  });
});
