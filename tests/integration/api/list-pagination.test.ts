import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getAllBills, getActivePolicies } = vi.hoisted(() => ({
  getAllBills: vi.fn(),
  getActivePolicies: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  withAuth: (handler: (request: NextRequest, session: string) => Promise<Response>) =>
    (request: NextRequest) => handler(request, "GABC"),
}));

vi.mock("@/lib/contracts/bill-payments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/contracts/bill-payments")>()),
  getAllBills,
}));

vi.mock("@/lib/contracts/insurance-cached", () => ({
  getActivePolicies,
}));

describe("bill and insurance list pagination", () => {
  const owner = "GBPABUP5J7BKR3QYCPGX6JV5L6TBLIZZIODF5RA634K6U4NBLLHC5WNU";
  const bills = [
    { id: "bill-b", dueDate: "2025-01-02T00:00:00Z", status: "unpaid" },
    { id: "bill-a", dueDate: "2025-01-01T00:00:00Z", status: "unpaid" },
    { id: "bill-c", dueDate: "2025-01-03T00:00:00Z", status: "unpaid" },
  ];
  const policies = [
    { id: "policy-b", nextPaymentDate: "2025-01-02T00:00:00Z" },
    { id: "policy-a", nextPaymentDate: "2025-01-01T00:00:00Z" },
    { id: "policy-c", nextPaymentDate: "2025-01-03T00:00:00Z" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    getAllBills.mockResolvedValue(bills);
    getActivePolicies.mockResolvedValue(policies);
  });

  it("returns disjoint, ordered bill pages and rejects an unknown cursor", async () => {
    const { GET } = await import("@/app/api/bills/route");

    const legacy = await GET(new NextRequest("http://localhost/api/bills"));
    expect(await legacy.json()).toEqual({
      success: true,
      data: { bills },
    });

    const first = await GET(new NextRequest("http://localhost/api/bills?limit=2"));
    const firstBody = await first.json();
    expect(firstBody).toMatchObject({
      data: [bills[1], bills[0]],
      nextCursor: "bill-b",
      hasMore: true,
    });

    const second = await GET(new NextRequest(
      `http://localhost/api/bills?limit=2&cursor=${firstBody.nextCursor}`
    ));
    expect((await second.json()).data).toEqual([bills[2]]);

    const invalid = await GET(new NextRequest("http://localhost/api/bills?cursor=unknown"));
    expect(invalid.status).toBe(400);

    const v1 = await import("@/app/api/v1/bills/route");
    const v1Response = await v1.GET(new NextRequest("http://localhost/api/v1/bills?limit=2", {
      headers: { "x-user": owner },
    }));
    expect(await v1Response.json()).toMatchObject({
      data: [bills[1], bills[0]],
      nextCursor: "bill-b",
      hasMore: true,
    });
  });

  it("returns disjoint, ordered policy pages and rejects an unknown cursor", async () => {
    const { GET } = await import("@/app/api/insurance/route");

    const legacy = await GET(new NextRequest("http://localhost/api/insurance?owner=GABC"));
    expect(await legacy.json()).toEqual({ policies });

    const first = await GET(new NextRequest("http://localhost/api/insurance?owner=GABC&limit=2"));
    const firstBody = await first.json();
    expect(firstBody).toMatchObject({
      data: [policies[1], policies[0]],
      nextCursor: "policy-b",
      hasMore: true,
    });

    const second = await GET(new NextRequest(
      `http://localhost/api/insurance?owner=GABC&limit=2&cursor=${firstBody.nextCursor}`
    ));
    expect((await second.json()).data).toEqual([policies[2]]);

    const invalid = await GET(new NextRequest(
      "http://localhost/api/insurance?owner=GABC&cursor=unknown"
    ));
    expect(invalid.status).toBe(400);

    const v1 = await import("@/app/api/v1/insurance/route");
    const v1Response = await v1.GET(new NextRequest(
      "http://localhost/api/v1/insurance?limit=2",
      { headers: { "x-user": owner } }
    ));
    expect(await v1Response.json()).toMatchObject({
      data: [policies[1], policies[0]],
      nextCursor: "policy-b",
      hasMore: true,
    });
  });
});
