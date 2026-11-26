import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUnpaidBills, type Bill } from "./contracts/bill-payments";
import { getBillsDueSoon } from "./bills-reminders";

vi.mock("./contracts/bill-payments", () => ({
  getUnpaidBills: vi.fn(),
}));

vi.mock("./ui/status-semantics", () => ({
  getBillStatusPresentation: vi.fn(),
}));

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "bill-1",
    owner: "wallet",
    name: "Electricity",
    amount: 50,
    dueDate: "2024-01-15T00:00:00",
    recurring: false,
    status: "unpaid",
    ...overrides,
  };
}

describe("getBillsDueSoon", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 15, 12));
    vi.mocked(getUnpaidBills).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes a bill due today with urgent urgency", async () => {
    vi.mocked(getUnpaidBills).mockResolvedValue([makeBill()]);

    await expect(getBillsDueSoon("wallet")).resolves.toMatchObject([
      { billId: "bill-1", urgency: "urgent" },
    ]);
  });

  it("includes a bill due on the four-day window boundary", async () => {
    vi.mocked(getUnpaidBills).mockResolvedValue([
      makeBill({ dueDate: "2024-01-19T00:00:00" }),
    ]);

    await expect(getBillsDueSoon("wallet")).resolves.toMatchObject([
      { billId: "bill-1", urgency: "upcoming" },
    ]);
  });

  it("excludes a bill due five days from now", async () => {
    vi.mocked(getUnpaidBills).mockResolvedValue([
      makeBill({ dueDate: "2024-01-20T00:00:00" }),
    ]);

    await expect(getBillsDueSoon("wallet")).resolves.toEqual([]);
  });

  it("includes overdue bills with overdue urgency", async () => {
    vi.mocked(getUnpaidBills).mockResolvedValue([
      makeBill({ dueDate: "2024-01-14T00:00:00" }),
    ]);

    await expect(getBillsDueSoon("wallet")).resolves.toMatchObject([
      { billId: "bill-1", urgency: "overdue" },
    ]);
  });

  it("excludes bills with invalid due dates", async () => {
    vi.mocked(getUnpaidBills).mockResolvedValue([
      makeBill({ dueDate: "not-a-date" }),
    ]);

    await expect(getBillsDueSoon("wallet")).resolves.toEqual([]);
  });

  it("excludes paid bills", async () => {
    vi.mocked(getUnpaidBills).mockResolvedValue([
      makeBill({ status: "paid" }),
    ]);

    await expect(getBillsDueSoon("wallet")).resolves.toEqual([]);
  });
});
