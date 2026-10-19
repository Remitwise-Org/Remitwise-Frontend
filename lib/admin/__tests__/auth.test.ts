import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isAdminAuthorized,
  getAdminIdentity,
  __resetConfigWarningForTests,
} from "../auth";

const VALID_SECRET_1 = "valid_admin_secret_key_1_at_least_32_chars_12345";
const VALID_SECRET_2 = "valid_admin_secret_key_2_at_least_32_chars_67890";
const SECRET_31_CHARS = "1234567890123456789012345678901"; // exactly 31 chars

function createMockRequest(options: {
  header?: string | null;
  cookie?: string | null;
  url?: string;
}) {
  const headersMap = new Map<string, string>();
  if (options.header !== undefined && options.header !== null) {
    headersMap.set("x-admin-key", options.header);
  }
  if (options.cookie !== undefined && options.cookie !== null) {
    headersMap.set("cookie", `admin_key=${options.cookie}`);
  }

  return {
    headers: {
      get(name: string): string | null {
        return headersMap.get(name.toLowerCase()) ?? null;
      },
    },
    url: options.url ?? "http://localhost:3000/api/cache/invalidate",
    cookies: {
      get(name: string) {
        if (
          options.cookie !== undefined &&
          options.cookie !== null &&
          (name === "admin_key" || name === "admin_secret")
        ) {
          return { value: options.cookie };
        }
        return undefined;
      },
    },
  };
}

describe("admin auth guard (lib/admin/auth.ts)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    __resetConfigWarningForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("isAdminAuthorized", () => {
    it("the correct header → true", () => {
      vi.stubEnv("ADMIN_SECRET", VALID_SECRET_1);
      const req = createMockRequest({ header: VALID_SECRET_1 });
      expect(isAdminAuthorized(req)).toBe(true);
    });

    it("the wrong value of the same length → false", () => {
      vi.stubEnv("ADMIN_SECRET", VALID_SECRET_1);
      const wrongSameLength = "x".repeat(VALID_SECRET_1.length);
      const req = createMockRequest({ header: wrongSameLength });
      expect(isAdminAuthorized(req)).toBe(false);
    });

    it("the correct value as admin_key cookie only → false", () => {
      vi.stubEnv("ADMIN_SECRET", VALID_SECRET_1);
      const req = createMockRequest({ cookie: VALID_SECRET_1 });
      expect(isAdminAuthorized(req)).toBe(false);
    });

    it("?admin_key= query → false", () => {
      vi.stubEnv("ADMIN_SECRET", VALID_SECRET_1);
      const req = createMockRequest({
        url: `http://localhost:3000/api/cache/invalidate?admin_key=${VALID_SECRET_1}`,
      });
      expect(isAdminAuthorized(req)).toBe(false);
    });

    it("ADMIN_SECRET unset → false", () => {
      delete process.env.ADMIN_SECRET;
      const req = createMockRequest({ header: VALID_SECRET_1 });
      expect(isAdminAuthorized(req)).toBe(false);
    });

    it("ADMIN_SECRET of 31 chars → false even with a matching header", () => {
      vi.stubEnv("ADMIN_SECRET", SECRET_31_CHARS);
      const req = createMockRequest({ header: SECRET_31_CHARS });
      expect(isAdminAuthorized(req)).toBe(false);
    });

    it("a header with a trailing space → false", () => {
      vi.stubEnv("ADMIN_SECRET", VALID_SECRET_1);
      const req = createMockRequest({ header: `${VALID_SECRET_1} ` });
      expect(isAdminAuthorized(req)).toBe(false);
    });

    it("with two rotated secrets A,B, both A and B → true", () => {
      vi.stubEnv("ADMIN_SECRET", `${VALID_SECRET_1},${VALID_SECRET_2}`);
      const reqA = createMockRequest({ header: VALID_SECRET_1 });
      const reqB = createMockRequest({ header: VALID_SECRET_2 });
      const reqC = createMockRequest({
        header: "valid_admin_secret_key_3_not_configured_12345",
      });

      expect(isAdminAuthorized(reqA)).toBe(true);
      expect(isAdminAuthorized(reqB)).toBe(true);
      expect(isAdminAuthorized(reqC)).toBe(false);
    });

    it("comparison does not throw on length mismatch: 1-character and 10,000-character headers both return false without throwing", () => {
      vi.stubEnv("ADMIN_SECRET", VALID_SECRET_1);

      const req1Char = createMockRequest({ header: "a" });
      expect(() => isAdminAuthorized(req1Char)).not.toThrow();
      expect(isAdminAuthorized(req1Char)).toBe(false);

      const req10kChar = createMockRequest({ header: "a".repeat(10000) });
      expect(() => isAdminAuthorized(req10kChar)).not.toThrow();
      expect(isAdminAuthorized(req10kChar)).toBe(false);

      const reqEmpty = createMockRequest({ header: "" });
      expect(() => isAdminAuthorized(reqEmpty)).not.toThrow();
      expect(isAdminAuthorized(reqEmpty)).toBe(false);
    });

    it("fails closed when request or headers are missing or malformed", () => {
      vi.stubEnv("ADMIN_SECRET", VALID_SECRET_1);
      expect(isAdminAuthorized(null as any)).toBe(false);
      expect(isAdminAuthorized({} as any)).toBe(false);
      expect(isAdminAuthorized({ headers: null } as any)).toBe(false);
    });
  });

  describe("getAdminIdentity", () => {
    it("secrets A/B produce different, stable admin:xxxxxxxx identities, and neither identity contains the secret", () => {
      vi.stubEnv("ADMIN_SECRET", `${VALID_SECRET_1},${VALID_SECRET_2}`);

      const reqA1 = createMockRequest({ header: VALID_SECRET_1 });
      const reqA2 = createMockRequest({ header: VALID_SECRET_1 });
      const reqB = createMockRequest({ header: VALID_SECRET_2 });

      const identityA1 = getAdminIdentity(reqA1);
      const identityA2 = getAdminIdentity(reqA2);
      const identityB = getAdminIdentity(reqB);

      // Stable per key
      expect(identityA1).toBe(identityA2);

      // Matches admin:xxxxxxxx format (8 hex characters)
      expect(identityA1).toMatch(/^admin:[0-9a-f]{8}$/);
      expect(identityB).toMatch(/^admin:[0-9a-f]{8}$/);

      // Different keys produce different identities
      expect(identityA1).not.toBe(identityB);

      // Neither identity leaks the secret
      expect(identityA1).not.toContain(VALID_SECRET_1);
      expect(identityB).not.toContain(VALID_SECRET_2);
    });

    it("returns 'anonymous' for unauthenticated requests", () => {
      vi.stubEnv("ADMIN_SECRET", VALID_SECRET_1);

      // Wrong key
      expect(
        getAdminIdentity(createMockRequest({ header: "wrong_secret_key" })),
      ).toBe("anonymous");

      // No header
      expect(getAdminIdentity(createMockRequest({}))).toBe("anonymous");

      // Cookie only
      expect(
        getAdminIdentity(createMockRequest({ cookie: VALID_SECRET_1 })),
      ).toBe("anonymous");

      // Trailing space in header
      expect(
        getAdminIdentity(
          createMockRequest({ header: `${VALID_SECRET_1} ` }),
        ),
      ).toBe("anonymous");

      // When ADMIN_SECRET is unset
      delete process.env.ADMIN_SECRET;
      expect(
        getAdminIdentity(createMockRequest({ header: VALID_SECRET_1 })),
      ).toBe("anonymous");
    });
  });

  describe("Startup configuration logging", () => {
    it("logs a single console.error naming the variable (never the value) when ADMIN_SECRET is unset or shorter than 32 chars", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      delete process.env.ADMIN_SECRET;
      __resetConfigWarningForTests();

      const req = createMockRequest({ header: "some_header_value" });
      expect(isAdminAuthorized(req)).toBe(false);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = errorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("ADMIN_SECRET");

      // Subsequent call does not log again
      expect(isAdminAuthorized(req)).toBe(false);
      expect(errorSpy).toHaveBeenCalledTimes(1);

      // Verify that short secret value is NEVER leaked in logs
      errorSpy.mockClear();
      __resetConfigWarningForTests();
      const leakedCandidate = "short_secret_value_do_not_leak";
      vi.stubEnv("ADMIN_SECRET", leakedCandidate);

      expect(isAdminAuthorized(req)).toBe(false);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain("ADMIN_SECRET");
      expect(errorSpy.mock.calls[0][0]).not.toContain(leakedCandidate);
    });
  });
});
