import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutosave } from "./useAutosave";
import { ToastProvider } from "@/lib/context/ToastContext";
import React from "react";

function renderAutosave(
  onSave: () => Promise<void>,
  options?: { debounceMs?: number; toastDuration?: number },
) {
  return renderHook(() => useAutosave(onSave, options), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(ToastProvider, null, children),
  });
}

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in idle state with no error and not dirty", () => {
    const { result } = renderAutosave(async () => {});
    expect(result.current.saveState).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.isDirty).toBe(false);
  });

  it("transitions to saving then saved after triggerSave and debounce", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderAutosave(onSave, { debounceMs: 500 });

    act(() => {
      result.current.triggerSave();
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.saveState).toBe("idle");

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.saveState).toBe("saved");
    expect(result.current.error).toBeNull();
  });

  it("flushes immediately when flush is called", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderAutosave(onSave, { debounceMs: 500 });

    await act(async () => {
      result.current.flush();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("debounces multiple rapid triggerSave calls", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderAutosave(onSave, { debounceMs: 500 });

    act(() => {
      result.current.triggerSave();
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      result.current.triggerSave();
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      result.current.triggerSave();
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("resets state back to idle", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderAutosave(onSave, { debounceMs: 500 });

    act(() => {
      result.current.triggerSave();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.saveState).toBe("idle");

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("returns error state when save throws", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Network error"));
    const { result } = renderAutosave(onSave, { debounceMs: 500 });

    act(() => {
      result.current.triggerSave();
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.saveState).toBe("error");
  });
});
