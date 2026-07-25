// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { AccessibleCalendarGrid, type CalendarDate } from "./AccessibleCalendarGrid";

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render the calendar showing July 2026 */
function renderJuly2026(overrides: Partial<Parameters<typeof AccessibleCalendarGrid>[0]> = {}) {
  const defaultValue: CalendarDate = { year: 2026, month: 7, day: 1 };
  return render(
    <AccessibleCalendarGrid
      value={defaultValue}
      ariaLabel="Test calendar"
      {...overrides}
    />,
  );
}

// ---------------------------------------------------------------------------
// ARIA roles and structure
// ---------------------------------------------------------------------------

describe("AccessibleCalendarGrid — ARIA roles and structure", () => {
  it("renders a container with role=application and aria-label", () => {
    renderJuly2026();
    const app = screen.getByRole("application", { name: "Test calendar" });
    expect(app).toBeInTheDocument();
  });

  it("renders a grid with role=grid", () => {
    renderJuly2026();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("grid is labelled by the month/year heading", () => {
    renderJuly2026();
    const grid = screen.getByRole("grid");
    const labelledById = grid.getAttribute("aria-labelledby");
    expect(labelledById).toBeTruthy();
    const heading = document.getElementById(labelledById!);
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toMatch(/July.*2026/i);
  });

  it("renders 7 columnheader cells (weekday names)", () => {
    renderJuly2026();
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(7);
  });

  it("renders day cells with role=gridcell", () => {
    renderJuly2026();
    const cells = screen.getAllByRole("gridcell");
    // July has 31 days + up to 10 padding cells; just verify they exist
    expect(cells.length).toBeGreaterThan(28);
  });

  it("day cells have a descriptive aria-label (full date)", () => {
    renderJuly2026();
    // July 4, 2026 should have a long-form label
    const cells = screen.getAllByRole("gridcell");
    const jul4 = cells.find((c) =>
      c.getAttribute("aria-label")?.includes("July") &&
      c.getAttribute("aria-label")?.includes("4") &&
      c.getAttribute("aria-label")?.includes("2026"),
    );
    expect(jul4).toBeDefined();
  });

  it("selected date has aria-selected=true", () => {
    renderJuly2026({ value: { year: 2026, month: 7, day: 15 } });
    const cells = screen.getAllByRole("gridcell");
    const selected = cells.find((c) => c.getAttribute("aria-selected") === "true");
    expect(selected).toBeDefined();
    expect(selected!.getAttribute("aria-label")).toMatch(/15/);
  });

  it("today has aria-current=date", () => {
    // Freeze system time to 2026-07-10 so isToday() marks that cell
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 10)); // July 10 2026

    renderJuly2026({ value: null });

    vi.useRealTimers();

    const cells = screen.getAllByRole("gridcell");
    const todayCell = cells.find((c) => c.getAttribute("aria-current") === "date");
    expect(todayCell).toBeDefined();
  });

  it("renders a live region for announcements", () => {
    const { container } = renderJuly2026();
    const live = container.querySelector("[aria-live='polite']");
    expect(live).not.toBeNull();
  });

  it("navigation buttons have descriptive aria-labels", () => {
    renderJuly2026();
    const buttons = screen.getAllByRole("button");
    // At least one button referencing previous month
    const prevBtn = buttons.find((b) =>
      /previous month/i.test(b.getAttribute("aria-label") ?? ""),
    );
    const nextBtn = buttons.find((b) =>
      /next month/i.test(b.getAttribute("aria-label") ?? ""),
    );
    expect(prevBtn).toBeDefined();
    expect(nextBtn).toBeDefined();
  });

  it("disabled dates have aria-disabled=true", () => {
    renderJuly2026({
      value: null,
      minDate: { year: 2026, month: 7, day: 15 },
    });
    const cells = screen.getAllByRole("gridcell");
    const disabledCells = cells.filter(
      (c) => c.getAttribute("aria-disabled") === "true" && c.getAttribute("aria-label"),
    );
    // All days before 15th should be disabled (days 1–14 = 14 cells)
    expect(disabledCells.length).toBeGreaterThanOrEqual(14);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe("AccessibleCalendarGrid — keyboard navigation", () => {
  it("ArrowRight moves roving tabIndex one day forward (LTR)", async () => {
    const user = userEvent.setup();
    renderJuly2026({ value: { year: 2026, month: 7, day: 10 } });

    // Focus the day-10 cell via the data-date attribute
    const day10 = document.querySelector<HTMLElement>('[data-date="2026-7-10"]')!;
    day10.focus();
    await user.keyboard("{ArrowRight}");

    // After ArrowRight, the roving tabIndex should have moved to day 11
    const day11 = document.querySelector<HTMLElement>('[data-date="2026-7-11"]')!;
    expect(day11.tabIndex).toBe(0);
    expect(day10.tabIndex).toBe(-1);
  });

  it("ArrowLeft moves roving tabIndex one day backward (LTR)", async () => {
    const user = userEvent.setup();
    renderJuly2026({ value: { year: 2026, month: 7, day: 10 } });

    const day10 = document.querySelector<HTMLElement>('[data-date="2026-7-10"]')!;
    day10.focus();
    await user.keyboard("{ArrowLeft}");

    const day9 = document.querySelector<HTMLElement>('[data-date="2026-7-9"]')!;
    expect(day9.tabIndex).toBe(0);
    expect(day10.tabIndex).toBe(-1);
  });

  it("ArrowDown moves roving tabIndex one week forward", async () => {
    const user = userEvent.setup();
    renderJuly2026({ value: { year: 2026, month: 7, day: 10 } });

    const day10 = document.querySelector<HTMLElement>('[data-date="2026-7-10"]')!;
    day10.focus();
    await user.keyboard("{ArrowDown}");

    const day17 = document.querySelector<HTMLElement>('[data-date="2026-7-17"]')!;
    expect(day17.tabIndex).toBe(0);
    expect(day10.tabIndex).toBe(-1);
  });

  it("ArrowUp moves roving tabIndex one week backward", async () => {
    const user = userEvent.setup();
    renderJuly2026({ value: { year: 2026, month: 7, day: 10 } });

    const day10 = document.querySelector<HTMLElement>('[data-date="2026-7-10"]')!;
    day10.focus();
    await user.keyboard("{ArrowUp}");

    const day3 = document.querySelector<HTMLElement>('[data-date="2026-7-3"]')!;
    expect(day3.tabIndex).toBe(0);
    expect(day10.tabIndex).toBe(-1);
  });

  it("Enter selects the focused date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderJuly2026({ value: { year: 2026, month: 7, day: 10 }, onChange });

    const day10 = document.querySelector<HTMLElement>('[data-date="2026-7-10"]')!;
    day10.focus();
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: 7, day: 10 });
  });

  it("Space selects the focused date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderJuly2026({ value: { year: 2026, month: 7, day: 10 }, onChange });

    const day10 = document.querySelector<HTMLElement>('[data-date="2026-7-10"]')!;
    day10.focus();
    await user.keyboard(" ");

    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: 7, day: 10 });
  });

  it("PageDown navigates to next month", async () => {
    const user = userEvent.setup();
    renderJuly2026({ value: { year: 2026, month: 7, day: 10 } });

    // Focus a cell so keyboard events land on the grid
    const day10 = document.querySelector<HTMLElement>('[data-date="2026-7-10"]')!;
    day10.focus();
    await user.keyboard("{PageDown}");

    // The h2 heading should now mention August
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toMatch(/August/i);
  });

  it("PageUp navigates to previous month", async () => {
    const user = userEvent.setup();
    renderJuly2026({ value: { year: 2026, month: 7, day: 10 } });

    const day10 = document.querySelector<HTMLElement>('[data-date="2026-7-10"]')!;
    day10.focus();
    await user.keyboard("{PageUp}");

    const heading = screen.getByRole("heading");
    expect(heading.textContent).toMatch(/June/i);
  });

  it("does not call onChange when Enter is pressed on a disabled date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderJuly2026({
      value: { year: 2026, month: 7, day: 5 },
      onChange,
      minDate: { year: 2026, month: 7, day: 10 },
    });

    // Focus the specific day-5 cell by data-date
    const day5 = document.querySelector<HTMLElement>('[data-date="2026-7-5"]')!;
    day5.focus();
    await user.keyboard("{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Mouse interaction
// ---------------------------------------------------------------------------

describe("AccessibleCalendarGrid — mouse interaction", () => {
  it("clicking a day calls onChange with the correct date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderJuly2026({ value: null, onChange });

    // Use data-date to unambiguously target July 20
    const day20 = document.querySelector<HTMLElement>('[data-date="2026-7-20"]')!;
    await user.click(day20);

    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: 7, day: 20 });
  });

  it("clicking a disabled day does not call onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderJuly2026({
      value: null,
      onChange,
      maxDate: { year: 2026, month: 7, day: 10 },
    });

    const day15 = document.querySelector<HTMLElement>('[data-date="2026-7-15"]')!;
    await user.click(day15);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking prev-month button navigates back", async () => {
    const user = userEvent.setup();
    renderJuly2026();

    const prevBtn = screen.getByRole("button", { name: /previous month/i });
    await user.click(prevBtn);

    // Check the h2 heading specifically (not the live region)
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toMatch(/June/i);
  });

  it("clicking next-month button navigates forward", async () => {
    const user = userEvent.setup();
    renderJuly2026();

    const nextBtn = screen.getByRole("button", { name: /next month/i });
    await user.click(nextBtn);

    const heading = screen.getByRole("heading");
    expect(heading.textContent).toMatch(/August/i);
  });
});

// ---------------------------------------------------------------------------
// RTL
// ---------------------------------------------------------------------------

describe("AccessibleCalendarGrid — RTL support", () => {
  it("sets dir=rtl on the wrapper for an Arabic locale", () => {
    const { container } = render(
      <AccessibleCalendarGrid
        locale="ar-SA"
        value={{ year: 2026, month: 7, day: 1 }}
        ariaLabel="Arabic calendar"
      />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveAttribute("dir", "rtl");
  });

  it("does not set dir=rtl for an LTR locale", () => {
    const { container } = render(
      <AccessibleCalendarGrid
        locale="en-US"
        value={{ year: 2026, month: 7, day: 1 }}
        ariaLabel="LTR calendar"
      />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).not.toHaveAttribute("dir", "rtl");
  });
});

// ---------------------------------------------------------------------------
// Axe accessibility audit
// ---------------------------------------------------------------------------

describe("AccessibleCalendarGrid — axe audit", () => {
  it("has no accessibility violations in default state", async () => {
    const { container } = renderJuly2026({ value: null });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations with a selected date", async () => {
    const { container } = renderJuly2026({
      value: { year: 2026, month: 7, day: 15 },
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations with disabled dates", async () => {
    const { container } = renderJuly2026({
      value: null,
      minDate: { year: 2026, month: 7, day: 10 },
      maxDate: { year: 2026, month: 7, day: 25 },
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations for an RTL Arabic locale", async () => {
    const { container } = render(
      <AccessibleCalendarGrid
        locale="ar-SA"
        value={{ year: 2026, month: 7, day: 1 }}
        ariaLabel="Arabic calendar"
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
