import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { apiClient } from "@/lib/client/apiClient";
import { useBillAlerts } from "./useBillAlerts";
import type { BillReminder } from "@/lib/bills-reminders";

afterEach(() => {
  vi.restoreAllMocks();
});

const reminder: BillReminder = {
  billId: "bill-1",
  name: "Electricity",
  amount: 42,
  dueDate: "2026-08-01",
  urgency: "urgent",
};

describe("useBillAlerts", () => {
  it("loads alerts from the bills due-soon endpoint on mount", async () => {
    vi.spyOn(apiClient, "getJson").mockResolvedValueOnce([reminder]);
    const { result } = renderHook(() => useBillAlerts());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(apiClient.getJson).toHaveBeenCalledWith("/api/v1/bills/due-soon");
    expect(result.current.alerts).toEqual([reminder]);
    expect(result.current.error).toBeNull();
  });

  it("surfaces an Error's message on failure", async () => {
    vi.spyOn(apiClient, "getJson").mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useBillAlerts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("boom");
    expect(result.current.alerts).toEqual([]);
  });

  it("leaves alerts empty without setting an error when the session-expiry flow takes over", async () => {
    vi.spyOn(apiClient, "getJson").mockResolvedValueOnce(null);
    const { result } = renderHook(() => useBillAlerts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.alerts).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("refresh() re-fetches", async () => {
    const getJson = vi
      .spyOn(apiClient, "getJson")
      .mockResolvedValueOnce([reminder])
      .mockResolvedValueOnce([]);
    const { result } = renderHook(() => useBillAlerts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.alerts).toEqual([reminder]);

    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getJson).toHaveBeenCalledTimes(2);
    expect(result.current.alerts).toEqual([]);
  });
});
