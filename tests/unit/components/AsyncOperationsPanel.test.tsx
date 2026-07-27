import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AsyncOperationsPanel from "@/components/AsyncOperationsPanel";
import { AsyncOperationsProvider } from "@/lib/context/AsyncOperationsContext";

const mockProps = {
  eyebrow: "Eyebrow",
  title: "Title",
  description: "Desc",
  stages: [],
  queueTitle: "Queue",
  queueDescription: "Queue desc",
  queueItems: [],
};

describe("AsyncOperationsPanel", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists collapse state across unmounts", () => {
    const { unmount } = render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} />
      </AsyncOperationsProvider>
    );

    const toggleBtn = screen.getByRole("button", { name: /Toggle operations panel/i });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    // Click to expand
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    // Unmount and remount (simulating route change)
    unmount();

    render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} />
      </AsyncOperationsProvider>
    );

    const toggleBtnAgain = screen.getByRole("button", { name: /Toggle operations panel/i });
    expect(toggleBtnAgain).toHaveAttribute("aria-expanded", "true");
  });

  it("gracefully handles sessionStorage failure", () => {
    // Simulate quota exceeded
    const setItemMock = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} />
      </AsyncOperationsProvider>
    );

    const toggleBtn = screen.getByRole("button", { name: /Toggle operations panel/i });
    // Should not throw when clicking
    expect(() => fireEvent.click(toggleBtn)).not.toThrow();
    
    // State should still update locally
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    
    setItemMock.mockRestore();
  });
});
