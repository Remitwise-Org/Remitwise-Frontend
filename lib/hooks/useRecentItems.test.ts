import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRecentItems } from "./useRecentItems";

describe("useRecentItems", () => {
  const STORAGE_KEY = "test_recent_items";

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should initialize with empty array if localStorage is empty", () => {
    const { result } = renderHook(() => useRecentItems(STORAGE_KEY));
    expect(result.current.items).toEqual([]);
  });

  it("should initialize with items from localStorage if available", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["item1", "item2"]));
    const { result } = renderHook(() => useRecentItems(STORAGE_KEY));
    expect(result.current.items).toEqual(["item1", "item2"]);
  });

  it("should add a new item to the front of the list", () => {
    const { result } = renderHook(() => useRecentItems(STORAGE_KEY));
    
    act(() => {
      result.current.addItem("item1");
    });
    expect(result.current.items).toEqual(["item1"]);
    
    act(() => {
      result.current.addItem("item2");
    });
    expect(result.current.items).toEqual(["item2", "item1"]);
    
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(["item2", "item1"]);
  });

  it("should remove duplicates and move the added item to the front", () => {
    const { result } = renderHook(() => useRecentItems(STORAGE_KEY));
    
    act(() => {
      result.current.addItem("item1");
      result.current.addItem("item2");
      result.current.addItem("item1");
    });
    
    expect(result.current.items).toEqual(["item1", "item2"]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(["item1", "item2"]);
  });

  it("should respect maxItems limit", () => {
    const { result } = renderHook(() => useRecentItems(STORAGE_KEY, 3));
    
    act(() => {
      result.current.addItem("1");
      result.current.addItem("2");
      result.current.addItem("3");
      result.current.addItem("4");
    });
    
    expect(result.current.items).toEqual(["4", "3", "2"]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(["4", "3", "2"]);
  });

  it("should use custom equality function if provided", () => {
    type ComplexItem = { id: string; name: string };
    const { result } = renderHook(() => 
      useRecentItems<ComplexItem>(STORAGE_KEY, 5, (a, b) => a.id === b.id)
    );
    
    act(() => {
      result.current.addItem({ id: "1", name: "First" });
      result.current.addItem({ id: "2", name: "Second" });
      result.current.addItem({ id: "1", name: "First Updated" });
    });
    
    expect(result.current.items).toEqual([
      { id: "1", name: "First Updated" },
      { id: "2", name: "Second" }
    ]);
  });

  it("should handle localStorage parse errors gracefully", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem(STORAGE_KEY, "invalid-json");
    
    const { result } = renderHook(() => useRecentItems(STORAGE_KEY));
    
    expect(result.current.items).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it("should clear items properly", () => {
    const { result } = renderHook(() => useRecentItems(STORAGE_KEY));
    
    act(() => {
      result.current.addItem("item1");
      result.current.clearItems();
    });
    
    expect(result.current.items).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
