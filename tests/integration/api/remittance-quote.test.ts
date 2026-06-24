import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as quoteGET } from "@/app/api/remittance/quote/route";
import { GET as qouteGET } from "@/app/api/remittance/qoute/route";

describe("Remittance quote API", () => {
  beforeEach(() => {
    delete process.env.ANCHOR_API_BASE_URL;
    process.env.QUOTE_TTL_SECONDS = "1";
  });

  it("returns 400 when required query params are missing", async () => {
    const req = new NextRequest("http://localhost/api/remittance/quote", {
      method: "GET",
    });

    const response = await quoteGET(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.validationErrors).toBeDefined();
    expect(Array.isArray(body.validationErrors)).toBe(true);
  });

  it("returns 400 for an unsupported currency code", async () => {
    const req = new NextRequest(
      "http://localhost/api/remittance/quote?amount=100&currency=US&toCurrency=PHP",
      { method: "GET" }
    );

    const response = await quoteGET(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.validationErrors).toBeDefined();
    expect(body.validationErrors.some((error: any) => error.path === "currency")).toBe(true);
  });

  it("returns a structured error when the anchor is unavailable", async () => {
    const req = new NextRequest(
      "http://localhost/api/remittance/quote?amount=100&currency=USD&toCurrency=PHP",
      { method: "GET" }
    );

    const response = await quoteGET(req);
    expect(response.status).toBe(502);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toEqual({
      code: "CONTRACT_ERROR",
      message: "Unable to resolve quote",
    });
  });

  it("still resolves via the legacy /qoute alias", async () => {
    const req = new NextRequest(
      "http://localhost/api/remittance/qoute?amount=100&currency=USD&toCurrency=PHP",
      { method: "GET" }
    );

    const response = await qouteGET(req);
    expect(response.status).toBe(502);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toEqual({
      code: "CONTRACT_ERROR",
      message: "Unable to resolve quote",
    });
  });
});
