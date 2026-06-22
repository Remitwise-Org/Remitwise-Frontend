import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logRequest: vi.fn(),
  logResponse: vi.fn(),
  logError: vi.fn(),
  normalizeRequestId: vi.fn((id: string) => id),
}));
vi.mock("@/lib/requestId", () => ({
  generateRequestId: vi.fn(() => "test-req-id"),
}));

const ALLOWED = "http://localhost:3000";
const BLOCKED = "https://attacker.invalid";
process.env.ALLOWED_ORIGINS = `${ALLOWED},https://app.remitwise.com`;
process.env.NODE_ENV = "test";

const { middleware } = await import("../../middleware");

let _ip = 0;
function freshIp() {
  _ip++;
  return `10.${Math.floor(_ip / 65025) % 255}.${Math.floor(_ip / 255) % 255}.${(_ip % 254) + 1}`;
}

function makeReq(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  ip = freshIp(),
): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: new Headers({ "x-forwarded-for": ip, ...headers }),
  });
}

// ── CORS ──────────────────────────────────────────────────────────────────────
describe("CORS", () => {
  it("OPTIONS preflight for allowed origin returns 204 with ACAO header", async () => {
    const res = await middleware(makeReq("OPTIONS", "/api/test", { origin: ALLOWED }));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("allowed origin is echoed in ACAO header with Vary: Origin", async () => {
    const res = await middleware(makeReq("GET", "/api/test", { origin: ALLOWED }));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("disallowed origin has no ACAO header (browser will block)", async () => {
    const res = await middleware(makeReq("GET", "/api/test", { origin: BLOCKED }));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("request with no origin header has no ACAO header", async () => {
    const res = await middleware(makeReq("GET", "/api/test"));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

// ── Security headers ──────────────────────────────────────────────────────────
describe("Security headers", () => {
  it("responses carry X-Content-Type-Options: nosniff", async () => {
    const res = await middleware(makeReq("GET", "/api/rates"));
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("responses carry X-Frame-Options: DENY", async () => {
    const res = await middleware(makeReq("GET", "/api/rates"));
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("responses carry X-XSS-Protection: 1; mode=block", async () => {
    const res = await middleware(makeReq("GET", "/api/rates"));
    expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
  });

  it("preflight response also carries security headers", async () => {
    const res = await middleware(makeReq("OPTIONS", "/api/test", { origin: ALLOWED }));
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("rate-limit 429 response carries security headers", async () => {
    const ip = freshIp();
    for (let i = 0; i <= 10; i++) {
      await middleware(makeReq("POST", "/api/auth/login", { "content-length": "50" }, ip));
    }
    const res = await middleware(makeReq("POST", "/api/auth/login", { "content-length": "50" }, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});

// ── Rate-limit tiers ──────────────────────────────────────────────────────────
describe("Rate-limit tiers", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("auth tier (/api/auth/*): 11th request in window returns 429 with rate-limit headers", async () => {
    const ip = freshIp();
    for (let i = 0; i < 10; i++) {
      const res = await middleware(makeReq("POST", "/api/auth/login", { "content-length": "50" }, ip));
      expect(res.status).not.toBe(429);
    }
    const res = await middleware(makeReq("POST", "/api/auth/login", { "content-length": "50" }, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("auth tier 429 response includes CORS headers for allowed origin", async () => {
    const ip = freshIp();
    for (let i = 0; i <= 11; i++) {
      await middleware(makeReq("POST", "/api/auth/login", { "content-length": "50", origin: ALLOWED }, ip));
    }
    const res = await middleware(makeReq("POST", "/api/auth/login", { "content-length": "50", origin: ALLOWED }, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
  });

  it("write tier: 51st POST to non-auth route returns 429 with limit 50", async () => {
    const ip = freshIp();
    for (let i = 0; i < 50; i++) {
      await middleware(makeReq("POST", "/api/transactions", { "content-length": "50" }, ip));
    }
    const res = await middleware(makeReq("POST", "/api/transactions", { "content-length": "50" }, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("50");
  });

  it("PUT and PATCH also use the write tier (50/min)", async () => {
    const ipPut = freshIp();
    const ipPatch = freshIp();
    for (let i = 0; i < 50; i++) {
      await middleware(makeReq("PUT", "/api/settings", { "content-length": "50" }, ipPut));
      await middleware(makeReq("PATCH", "/api/users", { "content-length": "50" }, ipPatch));
    }
    const resPut = await middleware(makeReq("PUT", "/api/settings", { "content-length": "50" }, ipPut));
    expect(resPut.status).toBe(429);
    const resPatch = await middleware(makeReq("PATCH", "/api/users", { "content-length": "50" }, ipPatch));
    expect(resPatch.status).toBe(429);
  });

  it("general tier: 101st GET returns 429 with limit 100", async () => {
    const ip = freshIp();
    for (let i = 0; i < 100; i++) {
      await middleware(makeReq("GET", "/api/rates", {}, ip));
    }
    const res = await middleware(makeReq("GET", "/api/rates", {}, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
  });

  it("rate limits are per-IP: exhausting one IP does not affect another", async () => {
    const ipA = freshIp();
    const ipB = freshIp();
    for (let i = 0; i <= 11; i++) {
      await middleware(makeReq("POST", "/api/auth/verify", { "content-length": "50" }, ipA));
    }
    const res = await middleware(makeReq("POST", "/api/auth/verify", { "content-length": "50" }, ipB));
    expect(res.status).not.toBe(429);
  });

  it("rate-limit window resets after 60 seconds", async () => {
    const ip = freshIp();
    for (let i = 0; i <= 11; i++) {
      await middleware(makeReq("POST", "/api/auth/refresh", { "content-length": "50" }, ip));
    }
    const blocked = await middleware(makeReq("POST", "/api/auth/refresh", { "content-length": "50" }, ip));
    expect(blocked.status).toBe(429);

    vi.advanceTimersByTime(61_000);

    const allowed = await middleware(makeReq("POST", "/api/auth/refresh", { "content-length": "50" }, ip));
    expect(allowed.status).not.toBe(429);
  });

  it("exactly-at-limit (10th auth) is allowed; 11th is blocked", async () => {
    const ip = freshIp();
    for (let i = 0; i < 9; i++) {
      await middleware(makeReq("POST", "/api/auth/login", { "content-length": "50" }, ip));
    }
    const tenth = await middleware(makeReq("POST", "/api/auth/login", { "content-length": "50" }, ip));
    expect(tenth.status).not.toBe(429);
    const eleventh = await middleware(makeReq("POST", "/api/auth/login", { "content-length": "50" }, ip));
    expect(eleventh.status).toBe(429);
  });
});

// ── Body size ─────────────────────────────────────────────────────────────────
describe("Body size validation", () => {
  it("POST content-length > 1MB returns 413 Payload Too Large", async () => {
    const res = await middleware(makeReq("POST", "/api/upload", { "content-length": "1048577" }));
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toBe("Payload Too Large");
  });

  it("POST content-length exactly 1MB passes", async () => {
    const res = await middleware(makeReq("POST", "/api/upload", { "content-length": "1048576" }));
    expect(res.status).not.toBe(413);
  });

  it("POST content-length just under 1MB passes", async () => {
    const res = await middleware(makeReq("POST", "/api/upload", { "content-length": "1048575" }));
    expect(res.status).not.toBe(413);
  });

  it("GET request is not subject to body-size validation", async () => {
    const res = await middleware(makeReq("GET", "/api/large", { "content-length": "99999999" }));
    expect(res.status).not.toBe(413);
  });

  it("DELETE request is not subject to body-size validation", async () => {
    const res = await middleware(makeReq("DELETE", "/api/item", { "content-length": "99999999" }));
    expect(res.status).not.toBe(413);
  });

  it("413 response body contains correct error message with limit", async () => {
    const res = await middleware(makeReq("POST", "/api/upload", { "content-length": "2097152" }));
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.message).toContain("1048576 bytes");
  });
});

// ── Playwright bypass ─────────────────────────────────────────────────────────
describe("Playwright test bypass", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("x-playwright-test: true skips rate limiting in non-production", async () => {
    process.env.NODE_ENV = "test";
    const ip = freshIp();
    for (let i = 0; i < 20; i++) {
      const res = await middleware(
        makeReq("POST", "/api/auth/login", { "x-playwright-test": "true", "content-length": "50" }, ip),
      );
      expect(res.status).not.toBe(429);
    }
  });

  it("x-playwright-test header has no bypass effect in production", async () => {
    process.env.NODE_ENV = "production";
    const ip = freshIp();
    for (let i = 0; i <= 11; i++) {
      await middleware(
        makeReq("POST", "/api/auth/login", { "x-playwright-test": "true", "content-length": "50" }, ip),
      );
    }
    const res = await middleware(
      makeReq("POST", "/api/auth/login", { "x-playwright-test": "true", "content-length": "50" }, ip),
    );
    expect(res.status).toBe(429);
    process.env.NODE_ENV = "test";
  });
});
