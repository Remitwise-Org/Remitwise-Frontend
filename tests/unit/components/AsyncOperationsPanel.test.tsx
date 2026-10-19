import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
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

const queueItems = [
  {
    title: "Split configuration update",
    duration: "Live",
    detail: "Building the remittance_split contract payload.",
    status: "active" as const,
  },
  {
    title: "Wallet signature pending",
    duration: "Waiting",
    detail: "Secondary work compresses into smaller cards.",
    status: "queued" as const,
  },
  {
    title: "Previous change confirmed",
    duration: "< 1 min",
    detail: "Completed items remain visible briefly.",
    status: "complete" as const,
  },
  {
    title: "Emergency transfer",
    duration: "2 min ago",
    detail: "The wallet rejected the signature request.",
    status: "failed" as const,
  },
];

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

describe("AsyncOperationsPanel — active spotlight", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("always renders the active item in full, outside the collapsed section", () => {
    render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={queueItems} />
      </AsyncOperationsProvider>
    );

    expect(screen.getByText("Split configuration update")).toBeInTheDocument();
    expect(
      screen.getByText("Building the remittance_split contract payload.")
    ).toBeInTheDocument();
    expect(screen.getByText("Live now")).toBeInTheDocument();

    // Rest-of-queue items are collapsed by default.
    expect(screen.queryByText("Wallet signature pending")).not.toBeInTheDocument();
    expect(screen.queryByText("Previous change confirmed")).not.toBeInTheDocument();
    expect(screen.queryByText("Emergency transfer")).not.toBeInTheDocument();
  });

  it("summarizes the collapsed items by status count", () => {
    render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={queueItems} />
      </AsyncOperationsProvider>
    );

    expect(
      screen.getByText(/3 more items · 1 queued · 1 confirmed · 1 failed/i)
    ).toBeInTheDocument();
  });

  it("reveals compact rows for queued/complete/failed items on expand", () => {
    render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={queueItems} />
      </AsyncOperationsProvider>
    );

    fireEvent.click(screen.getByText(/3 more items/i));

    expect(screen.getByText("Wallet signature pending")).toBeInTheDocument();
    expect(screen.getByText("Previous change confirmed")).toBeInTheDocument();
    expect(screen.getByText("Emergency transfer")).toBeInTheDocument();
  });

  it("does not show Retry until a failed row's own detail toggle is expanded", () => {
    render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={queueItems} />
      </AsyncOperationsProvider>
    );

    fireEvent.click(screen.getByText(/3 more items/i));
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("expanding a failed row's own detail toggle surfaces Retry", () => {
    render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={queueItems} />
      </AsyncOperationsProvider>
    );

    fireEvent.click(screen.getByText(/3 more items/i));

    const failedRow = screen.getByText("Emergency transfer").closest("article");
    expect(failedRow).not.toBeNull();
    const rowToggle = failedRow!.querySelector("button");
    expect(rowToggle).not.toBeNull();
    fireEvent.click(rowToggle!);

    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no operations at all", () => {
    render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={[]} />
      </AsyncOperationsProvider>
    );

    expect(
      screen.getByText(/No operations yet\. This panel populates automatically/i)
    ).toBeInTheDocument();
  });

  it("announces the active item's status via the live region", () => {
    render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={queueItems} />
      </AsyncOperationsProvider>
    );

    const live = screen.getByText(/Split configuration update: Live now/i, {
      selector: "[aria-live='polite']",
    });
    expect(live).toBeInTheDocument();
  });

  it("falls back to announcing the newest queue item when nothing is active", () => {
    const noActive = queueItems.filter((item) => item.status !== "active");
    render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={noActive} />
      </AsyncOperationsProvider>
    );

    const live = screen.getByText(/Wallet signature pending: Queued/i, {
      selector: "[aria-live='polite']",
    });
    expect(live).toBeInTheDocument();
  });

  it("does not steal focus from elsewhere when the queue re-renders", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    expect(document.activeElement).toBe(input);

    const { rerender } = render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={queueItems} />
      </AsyncOperationsProvider>
    );
    expect(document.activeElement).toBe(input);

    rerender(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={[...queueItems].reverse()} />
      </AsyncOperationsProvider>
    );
    expect(document.activeElement).toBe(input);

    document.body.removeChild(input);
  });

  it("has no accessibility violations with a full queue rendered and expanded", async () => {
    const { container } = render(
      <AsyncOperationsProvider>
        <AsyncOperationsPanel {...mockProps} queueItems={queueItems} />
      </AsyncOperationsProvider>
    );

    fireEvent.click(screen.getByText(/3 more items/i));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
