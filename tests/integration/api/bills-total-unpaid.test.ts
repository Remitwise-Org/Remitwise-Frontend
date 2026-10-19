import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const getUnpaidBills = vi.fn();
const getTotalUnpaid = vi.fn();

vi.mock("@/lib/contracts/bill-payments", () => ({
  getUnpaidBills: (...args: unknown[]) => getUnpaidBills(...args),
  getTotalUnpaid: (...args: unknown[]) => getTotalUnpaid(...args),
}));

describe("GET /api/bills/total-unpaid", () => {
  const ORIGINAL_SECRET = process.env.AUTH_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.AUTH_SECRET = ORIGINAL_SECRET;
  });

  it("fetches unpaid bills once and derives the total from that list, instead of fetching twice", async () => {
    const bills = [{ id: "b1", amount: 50 }, { id: "b2", amount: 25 }];
    getUnpaidBills.mockResolvedValue(bills);
    getTotalUnpaid.mockResolvedValue(75);

    const { GET } = await import("@/app/api/bills/total-unpaid/route");
    const req = new NextRequest("http://localhost/api/bills/total-unpaid?owner=GABC", {
      headers: { authorization: "Bearer test-secret" },
    });

    const response = await GET(req);
    expect(response.status).toBe(200);

    // getUnpaidBills is the only bills-fetching call; getTotalUnpaid must
    // receive that already-fetched list rather than re-fetching internally.
    expect(getUnpaidBills).toHaveBeenCalledTimes(1);
    expect(getTotalUnpaid).toHaveBeenCalledWith("GABC", bills);

    const body = await response.json();
    expect(body.data).toEqual({ totalUnpaid: 75, count: 2, bills });
  });

  it("returns 401 without a valid bearer token", async () => {
    const { GET } = await import("@/app/api/bills/total-unpaid/route");
    const req = new NextRequest("http://localhost/api/bills/total-unpaid");

    const response = await GET(req);
    expect(response.status).toBe(401);
    expect(getUnpaidBills).not.toHaveBeenCalled();
  });
});
