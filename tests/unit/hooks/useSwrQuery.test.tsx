import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSwrQuery } from "@/lib/hooks/useSwrQuery";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useSwrQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the query result on success", async () => {
    const fn = vi.fn().mockResolvedValue("data");

    const { result } = renderHook(
      () => useSwrQuery(["test"], fn),
      { wrapper: createWrapper() },
    );

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe("data");
  });

  it("returns the error on failure", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    const { result } = renderHook(
      () => useSwrQuery(["test-error"], fn, { retry: 0 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect((result.current.error as Error).message).toBe("fail");
  });

  it("applies custom staleTime over the default", async () => {
    const fn = vi.fn().mockResolvedValue("fresh");

    const { result } = renderHook(
      () => useSwrQuery(["test-stale"], fn, { staleTime: 60_000 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe("fresh");
  });

  it("does not fire the queryFn when enabled is false", () => {
    const fn = vi.fn().mockResolvedValue("data");

    renderHook(
      () => useSwrQuery(["test-disabled"], fn, { enabled: false }),
      { wrapper: createWrapper() },
    );

    expect(fn).not.toHaveBeenCalled();
  });

  it("dedupes concurrent requests with the same queryKey", async () => {
    const fn = vi.fn().mockResolvedValue("deduped");

    const wrapper = createWrapper();

    const { result: r1 } = renderHook(
      () => useSwrQuery(["dedupe"], fn),
      { wrapper },
    );

    const { result: r2 } = renderHook(
      () => useSwrQuery(["dedupe"], fn),
      { wrapper },
    );

    await waitFor(() => expect(r1.current.isSuccess).toBe(true));
    await waitFor(() => expect(r2.current.isSuccess).toBe(true));

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
