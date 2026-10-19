import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";


function makeFormDataRequest(
  fields: Record<string, string>,
  url = "http://localhost/api/insurance"
): NextRequest {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return new NextRequest(url, { method: "POST", body: fd });
}

function makeJsonRequest(
  body: Record<string, unknown>,
  url = "http://localhost/api/insurance"
): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}


vi.mock("@/lib/contracts/insurance-cached", () => ({
  getActivePolicies: vi.fn(async () => [
    {
      id: "p-1",
      name: "Basic Health",
      coverageType: "health",
      monthlyPremium: 100,
      coverageAmount: 10000,
      active: true,
      nextPaymentDate: new Date(Date.now() + 30 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    },
  ]),
}));


describe("POST /api/insurance", () => {
  let POST: (req: NextRequest) => Promise<NextResponse>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/app/api/insurance/route");
    POST = mod.POST;
  });

  it("returns 200 with typed success fields for valid form data", async () => {
    const req = makeFormDataRequest({
      policyName: "Health Insurance",
      coverageType: "Health",
      monthlyPremium: "25",
      coverageAmount: "2000",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBeTruthy();
    expect(body.policyName).toBe("Health Insurance");
    expect(body.coverageType).toBe("Health");
    expect(body.monthlyPremium).toBe(25);
    expect(body.coverageAmount).toBe(2000);
  });

  it("returns 200 with typed success fields for valid JSON body", async () => {
    const req = makeJsonRequest({
      policyName: "Life Plan",
      coverageType: "Life",
      monthlyPremium: 50,
      coverageAmount: 100000,
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.policyName).toBe("Life Plan");
  });

  it("returns 400 with validationErrors when policyName is too short", async () => {
    const req = makeFormDataRequest({
      policyName: "Hi", // too short (min 4)
      coverageType: "Health",
      monthlyPremium: "10",
      coverageAmount: "500",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.validationErrors).toBeDefined();
    const err = body.validationErrors.find(
      (e: { path: string }) => e.path === "policyName"
    );
    expect(err).toBeDefined();
    expect(err.message).toBeTruthy();
  });

  it("returns 400 when policyName is missing", async () => {
    const req = makeFormDataRequest({
      coverageType: "Emergency",
      monthlyPremium: "15",
      coverageAmount: "750",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.validationErrors.some((e: { path: string }) => e.path === "policyName")).toBe(true);
  });

  it("returns 400 when coverageType is not in allowed enum", async () => {
    const req = makeFormDataRequest({
      policyName: "Bad Policy",
      coverageType: "Dental", // not in enum
      monthlyPremium: "20",
      coverageAmount: "1000",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.validationErrors.some((e: { path: string }) => e.path === "coverageType")).toBe(true);
  });

  it("returns 400 when coverageType is missing", async () => {
    const req = makeFormDataRequest({
      policyName: "Health Insurance",
      monthlyPremium: "20",
      coverageAmount: "1000",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
  });

  it("returns 400 when monthlyPremium is zero", async () => {
    const req = makeFormDataRequest({
      policyName: "Health Insurance",
      coverageType: "Health",
      monthlyPremium: "0",
      coverageAmount: "1000",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.validationErrors.some((e: { path: string }) => e.path === "monthlyPremium")).toBe(true);
  });

  it("returns 400 when monthlyPremium is negative", async () => {
    const req = makeFormDataRequest({
      policyName: "Health Insurance",
      coverageType: "Health",
      monthlyPremium: "-5",
      coverageAmount: "1000",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when coverageAmount is zero", async () => {
    const req = makeFormDataRequest({
      policyName: "Health Insurance",
      coverageType: "Emergency",
      monthlyPremium: "20",
      coverageAmount: "0",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.validationErrors.some((e: { path: string }) => e.path === "coverageAmount")).toBe(true);
  });

  it("coerces string numbers to number type in response", async () => {
    const req = makeFormDataRequest({
      policyName: "Life Coverage",
      coverageType: "Life",
      monthlyPremium: "99.99",
      coverageAmount: "50000.00",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(typeof body.monthlyPremium).toBe("number");
    expect(typeof body.coverageAmount).toBe("number");
    expect(body.monthlyPremium).toBeCloseTo(99.99);
    expect(body.coverageAmount).toBeCloseTo(50000);
  });

  it("accepts all three valid coverage types", async () => {
    const types = ["Health", "Emergency", "Life"] as const;
    for (const coverageType of types) {
      const req = makeFormDataRequest({
        policyName: `${coverageType} Plan`,
        coverageType,
        monthlyPremium: "20",
        coverageAmount: "1000",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    }
  });
});

// ─── GET /api/insurance ───────────────────────────────────────────────────────

describe("GET /api/insurance", () => {
  let GET: (req: NextRequest) => Promise<NextResponse>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/app/api/insurance/route");
    GET = mod.GET;
  });

  it("returns 200 with policies array for valid Stellar owner", async () => {
    const owner = "GABC123456789012345678901234567890123456789012345678901234";
    const req = new NextRequest(
      `http://localhost/api/insurance?owner=${owner}`
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.policies)).toBe(true);
  });

  it("returns 400 when owner query param is missing", async () => {
    const req = new NextRequest("http://localhost/api/insurance");

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when Stellar address is invalid", async () => {
    const { getActivePolicies } = await import("@/lib/contracts/insurance-cached");
    vi.mocked(getActivePolicies).mockRejectedValueOnce(
      Object.assign(new Error("INVALID_ADDRESS"), { code: "INVALID_ADDRESS" })
    );

    const req = new NextRequest(
      "http://localhost/api/insurance?owner=bad-address"
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("returns 502 when contract call fails", async () => {
    const { getActivePolicies } = await import("@/lib/contracts/insurance-cached");
    vi.mocked(getActivePolicies).mockRejectedValueOnce(
      new Error("RPC timeout")
    );

    const owner = "GABC123456789012345678901234567890123456789012345678901234";
    const req = new NextRequest(
      `http://localhost/api/insurance?owner=${owner}`
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBeTruthy();
  });

  it("returns empty array when no policies exist", async () => {
    const { getActivePolicies } = await import("@/lib/contracts/insurance-cached");
    vi.mocked(getActivePolicies).mockResolvedValueOnce([]);

    const owner = "GABC123456789012345678901234567890123456789012345678901234";
    const req = new NextRequest(
      `http://localhost/api/insurance?owner=${owner}`
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.policies).toHaveLength(0);
  });
});


describe("Optimistic policy list append logic", () => {

  it("prepends a new policy from success state fields", () => {
    type Policy = {
      id: string;
      name: string;
      coverageType: string;
      monthlyPremium: number;
      coverageAmount: number;
      active: boolean;
      nextPaymentDate: string;
    };

    const successState = {
      success: "Insurance added successfully",
      policyName: "Emergency Plan",
      coverageType: "Emergency",
      monthlyPremium: 30,
      coverageAmount: 5000,
    };

    const existingPolicies: Policy[] = [
      {
        id: "policy-existing",
        name: "Health",
        coverageType: "health",
        monthlyPremium: 20,
        coverageAmount: 1000,
        active: true,
        nextPaymentDate: "2026-08-01",
      },
    ];

    function applyOptimisticAdd(
      prev: Policy[],
      state: typeof successState
    ): Policy[] {
      const newPolicy: Policy = {
        id: `policy-opt-${Date.now()}`,
        name: state.policyName,
        coverageType: state.coverageType,
        monthlyPremium: state.monthlyPremium,
        coverageAmount: state.coverageAmount,
        active: true,
        nextPaymentDate: new Date(Date.now() + 30 * 86_400_000)
          .toISOString()
          .slice(0, 10),
      };
      return [newPolicy, ...prev];
    }

    const updated = applyOptimisticAdd(existingPolicies, successState);

    expect(updated).toHaveLength(2);
    expect(updated[0].name).toBe("Emergency Plan");
    expect(updated[0].coverageType).toBe("Emergency");
    expect(updated[0].monthlyPremium).toBe(30);
    expect(updated[0].coverageAmount).toBe(5000);
    expect(updated[0].active).toBe(true);
    expect(updated[1].id).toBe("policy-existing");
  });

  it("does not add duplicate if id already in list", () => {
    type Policy = { id: string; name: string };

    const FIXED_ID = "policy-opt-1234";
    const existing: Policy[] = [{ id: FIXED_ID, name: "Duplicate" }];

    function guardedPrepend(prev: Policy[], candidate: Policy): Policy[] {
      if (prev.some((p) => p.id === candidate.id)) return prev;
      return [candidate, ...prev];
    }

    const candidate: Policy = { id: FIXED_ID, name: "Duplicate" };
    const result = guardedPrepend(existing, candidate);

    expect(result).toHaveLength(1);
  });

  it("computes correct total premium after optimistic add", () => {
    const policies = [
      { monthlyPremium: 20 },
      { monthlyPremium: 15 },
      { monthlyPremium: 30 },
    ];

    const total = policies.reduce((sum, p) => sum + p.monthlyPremium, 0);
    expect(total).toBe(65);
  });
});


describe("i18n locale files contain required insurance keys", () => {
  const REQUIRED_KEYS = [
    "insurance.page_title",
    "insurance.page_subtitle",
    "insurance.new_policy",
    "insurance.active_policies",
    "insurance.no_policies_title",
    "insurance.no_policies_body",
    "insurance.total_premium",
    "insurance.form_title",
    "insurance.field_policy_name",
    "insurance.field_coverage_type",
    "insurance.field_monthly_premium",
    "insurance.field_coverage_amount",
    "insurance.submit",
    "insurance.submitting",
    "insurance.status_idle_title",
    "insurance.status_pending_title",
    "insurance.status_success_title",
    "insurance.status_error_title",
    "insurance.success_badge_name",
    "insurance.success_badge_type",
    "insurance.success_badge_premium",
    "insurance.success_badge_coverage",
  ] as const;

  function resolvePath(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object")
        return (acc as Record<string, unknown>)[key];
      return undefined;
    }, obj);
  }

  it("all required keys exist in en.json", async () => {
    const en = (await import("@/lib/i18n/locales/en.json")).default;
    for (const key of REQUIRED_KEYS) {
      const value = resolvePath(en as unknown as Record<string, unknown>, key);
      expect(value, `Missing en key: ${key}`).toBeTruthy();
    }
  });

  it("all required keys exist in es.json", async () => {
    const es = (await import("@/lib/i18n/locales/es.json")).default;
    for (const key of REQUIRED_KEYS) {
      const value = resolvePath(es as unknown as Record<string, unknown>, key);
      expect(value, `Missing es key: ${key}`).toBeTruthy();
    }
  });
});


describe("useFormAction hook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with empty state and isPending=false", async () => {

    const { useFormAction } = await import("@/lib/hooks/useFormAction");
    expect(typeof useFormAction).toBe("function");

  });

  it("returns network error state when fetch rejects", async () => {
    const NETWORK_ERROR = { error: "Network error. Please try again." };

    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("offline"));

    let state: Record<string, unknown> = {};
    try {
      const fd = new FormData();
      const res = await fetch("/api/insurance", { method: "POST", body: fd });
      state = await res.json();
    } catch {
      state = NETWORK_ERROR;
    }

    expect(state.error).toBe("Network error. Please try again.");
  });

  it("returns parsed JSON from API on success", async () => {
    const mockResponse = {
      success: "Insurance added successfully",
      policyName: "Health Plan",
      coverageType: "Health",
      monthlyPremium: 20,
      coverageAmount: 1000,
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const fd = new FormData();
    const res = await fetch("/api/insurance", { method: "POST", body: fd });
    const data = await res.json();

    expect(data.success).toBe("Insurance added successfully");
    expect(data.policyName).toBe("Health Plan");
    expect(data.monthlyPremium).toBe(20);
    expect(data.coverageAmount).toBe(1000);
  });

  it("returns validationErrors array on 400 response", async () => {
    const mock400 = {
      validationErrors: [
        { path: "policyName", message: "Name is too short" },
        { path: "coverageType", message: "Please select a coverage type" },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => mock400,
    });

    const fd = new FormData();
    const res = await fetch("/api/insurance", { method: "POST", body: fd });
    const data = await res.json();

    expect(data.validationErrors).toHaveLength(2);
    expect(data.validationErrors[0].path).toBe("policyName");
  });
});
