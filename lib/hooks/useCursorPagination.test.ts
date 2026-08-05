import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useCursorPagination } from "./useCursorPagination";

describe("useCursorPagination", () => {
  it("loads the first page on mount", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [1, 2, 3], nextCursor: "c1" });
    const { result } = renderHook(() => useCursorPagination({ fetchPage }));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchPage).toHaveBeenCalledWith(undefined, true);
    expect(result.current.items).toEqual([1, 2, 3]);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isInitialLoading).toBe(false);
  });

  it("appends items and advances the cursor on loadMore", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], nextCursor: "c1" })
      .mockResolvedValueOnce({ items: [3, 4], nextCursor: undefined });
    const { result } = renderHook(() => useCursorPagination({ fetchPage }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.loadingMore).toBe(false));

    expect(fetchPage).toHaveBeenLastCalledWith("c1", false);
    expect(result.current.items).toEqual([1, 2, 3, 4]);
    expect(result.current.hasMore).toBe(false);
  });

  it("does not fetch again once hasMore is false", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [1], nextCursor: undefined });
    const { result } = renderHook(() => useCursorPagination({ fetchPage }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(false);

    act(() => result.current.loadMore());
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("surfaces an Error's message on failure", async () => {
    const fetchPage = vi.fn().mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useCursorPagination({ fetchPage }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("network down");
    expect(result.current.items).toEqual([]);
  });

  it("falls back to fallbackErrorMessage for a non-Error rejection", async () => {
    const fetchPage = vi.fn().mockRejectedValue("nope");
    const { result } = renderHook(() =>
      useCursorPagination({ fetchPage, fallbackErrorMessage: "Custom failure" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Custom failure");
  });

  it("marks isInitialLoading true only for the very first fetch", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], nextCursor: undefined });
    const { result } = renderHook(() => useCursorPagination({ fetchPage }));

    expect(result.current.isInitialLoading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isInitialLoading).toBe(false);
  });
});
