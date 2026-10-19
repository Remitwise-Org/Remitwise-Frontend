import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChipList } from "./ChipList";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Chip({ label, selected = false }: { label: string; selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition }
    >
      {selected && <span aria-hidden="true">?</span>}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Wrap mode
// ---------------------------------------------------------------------------

describe("ChipList - wrap mode", () => {
  it("renders_all_chips_when_overflow_is_wrap", () => {
    render(
      <ChipList overflow="wrap" ariaLabel="Test wrap">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
        <Chip label="Savings" />
        <Chip label="Family" />
      </ChipList>,
    );

    expect(screen.getByText("Send")).toBeInTheDocument();
    expect(screen.getByText("Split")).toBeInTheDocument();
    expect(screen.getByText("Bills")).toBeInTheDocument();
    expect(screen.getByText("Insurance")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Family")).toBeInTheDocument();
  });

  it("renders_no_more_button_in_wrap_mode", () => {
    render(
      <ChipList overflow="wrap" ariaLabel="Test wrap">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
        <Chip label="Savings" />
        <Chip label="Family" />
      </ChipList>,
    );

    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it("renders_with_correct_list_role", () => {
    render(
      <ChipList overflow="wrap" ariaLabel="Filter types">
        <Chip label="Send" />
      </ChipList>,
    );

    expect(screen.getByRole("list", { name: "Filter types" })).toBeInTheDocument();
  });

  it("handles_empty_children", () => {
    render(<ChipList overflow="wrap" ariaLabel="Empty list" />);

    expect(screen.getByRole("list", { name: "Empty list" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Count mode
// ---------------------------------------------------------------------------

describe("ChipList - count mode", () => {
  it("renders_only_maxVisible_chips_when_collapsed", () => {
    render(
      <ChipList overflow="count" maxVisible={3} ariaLabel="Test count">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
        <Chip label="Savings" />
        <Chip label="Family" />
      </ChipList>,
    );

    expect(screen.getByText("Send")).toBeInTheDocument();
    expect(screen.getByText("Split")).toBeInTheDocument();
    expect(screen.getByText("Bills")).toBeInTheDocument();
    expect(screen.queryByText("Insurance")).not.toBeInTheDocument();
    expect(screen.queryByText("Savings")).not.toBeInTheDocument();
    expect(screen.queryByText("Family")).not.toBeInTheDocument();
  });

  it("renders_more_button_with_correct_count", () => {
    render(
      <ChipList overflow="count" maxVisible={3} ariaLabel="Test count">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
        <Chip label="Savings" />
        <Chip label="Family" />
      </ChipList>,
    );

    expect(screen.getByText("+3 more")).toBeInTheDocument();
  });

  it("expands_to_show_all_chips_on_more_click", async () => {
    const user = userEvent.setup();

    render(
      <ChipList overflow="count" maxVisible={3} ariaLabel="Test count">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
        <Chip label="Savings" />
        <Chip label="Family" />
      </ChipList>,
    );

    await user.click(screen.getByText("+3 more"));

    expect(screen.getByText("Insurance")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Family")).toBeInTheDocument();
  });

  it("shows_show_less_after_expanding", async () => {
    const user = userEvent.setup();

    render(
      <ChipList overflow="count" maxVisible={3} ariaLabel="Test count">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
        <Chip label="Savings" />
        <Chip label="Family" />
      </ChipList>,
    );

    await user.click(screen.getByText("+3 more"));

    expect(screen.getByText("Show less")).toBeInTheDocument();
  });

  it("collapses_back_on_show_less_click", async () => {
    const user = userEvent.setup();

    render(
      <ChipList overflow="count" maxVisible={3} ariaLabel="Test count">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
        <Chip label="Savings" />
        <Chip label="Family" />
      </ChipList>,
    );

    await user.click(screen.getByText("+3 more"));
    await user.click(screen.getByText("Show less"));

    expect(screen.queryByText("Insurance")).not.toBeInTheDocument();
    expect(screen.getByText("+3 more")).toBeInTheDocument();
  });

  it("renders_no_more_button_when_chips_less_than_maxVisible", () => {
    render(
      <ChipList overflow="count" maxVisible={5} ariaLabel="Test count">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
      </ChipList>,
    );

    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it("renders_all_when_maxVisible_equals_total", () => {
    render(
      <ChipList overflow="count" maxVisible={3} ariaLabel="Test count">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
      </ChipList>,
    );

    expect(screen.getByText("Send")).toBeInTheDocument();
    expect(screen.getByText("Split")).toBeInTheDocument();
    expect(screen.getByText("Bills")).toBeInTheDocument();
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it("supports_selecting_a_chip_after_expand", async () => {
    const user = userEvent.setup();

    render(
      <ChipList overflow="count" maxVisible={2} ariaLabel="Test count">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
      </ChipList>,
    );

    await user.click(screen.getByText("+1 more"));
    await user.click(screen.getByText("Bills"));

    expect(screen.getByText("Bills")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Hybrid mode
// ---------------------------------------------------------------------------

describe("ChipList - hybrid mode", () => {
  it("renders_all_chips_when_total_is_within_maxVisible", () => {
    render(
      <ChipList overflow="hybrid" maxVisible={5} maxHeight={100} ariaLabel="Test hybrid">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
      </ChipList>,
    );

    expect(screen.getByText("Send")).toBeInTheDocument();
    expect(screen.getByText("Split")).toBeInTheDocument();
    expect(screen.getByText("Bills")).toBeInTheDocument();
  });

  it("renders_more_button_when_chips_exceed_maxVisible", () => {
    render(
      <ChipList overflow="hybrid" maxVisible={2} maxHeight={100} ariaLabel="Test hybrid">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
      </ChipList>,
    );

    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("renders_correct_hidden_count", () => {
    render(
      <ChipList overflow="hybrid" maxVisible={3} maxHeight={100} ariaLabel="Test hybrid">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
        <Chip label="Savings" />
        <Chip label="Family" />
      </ChipList>,
    );

    expect(screen.getByText("+3 more")).toBeInTheDocument();
  });

  it("applies_maxHeight_style_when_collapsed", () => {
    render(
      <ChipList overflow="hybrid" maxVisible={2} maxHeight={150} ariaLabel="Test hybrid">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
      </ChipList>,
    );

    const list = screen.getByRole("list", { name: "Test hybrid" });
    expect(list.style.maxHeight).toBe("150px");
    expect(list.style.overflow).toBe("hidden");
  });

  it("removes_maxHeight_when_expanded", async () => {
    const user = userEvent.setup();

    render(
      <ChipList overflow="hybrid" maxVisible={2} maxHeight={150} ariaLabel="Test hybrid">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
      </ChipList>,
    );

    await user.click(screen.getByText("+2 more"));

    const list = screen.getByRole("list", { name: "Test hybrid" });
    expect(list.style.maxHeight).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// Default mode (wrap)
// ---------------------------------------------------------------------------

describe("ChipList - default mode", () => {
  it("defaults_to_wrap_mode", () => {
    render(
      <ChipList ariaLabel="Default test">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
        <Chip label="Savings" />
        <Chip label="Family" />
      </ChipList>,
    );

    expect(screen.getByText("Send")).toBeInTheDocument();
    expect(screen.getByText("Split")).toBeInTheDocument();
    expect(screen.getByText("Bills")).toBeInTheDocument();
    expect(screen.getByText("Insurance")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Family")).toBeInTheDocument();
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe("ChipList - accessibility", () => {
  it("has_list_role", () => {
    render(
      <ChipList overflow="count" maxVisible={3} ariaLabel="Accessible filters">
        <Chip label="Send" />
        <Chip label="Split" />
      </ChipList>,
    );

    expect(screen.getByRole("list", { name: "Accessible filters" })).toBeInTheDocument();
  });

  it("has_listitem_roles", () => {
    render(
      <ChipList overflow="wrap" ariaLabel="Chip items">
        <Chip label="Send" />
        <Chip label="Split" />
      </ChipList>,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
  });

  it("more_button_has_descriptive_aria_label", () => {
    render(
      <ChipList overflow="count" maxVisible={2} ariaLabel="Filters">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
      </ChipList>,
    );

    expect(
      screen.getByRole("button", { name: "Show 2 more filter options" }),
    ).toBeInTheDocument();
  });

  it("show_less_button_has_aria_label", () => {
    render(
      <ChipList overflow="count" maxVisible={2} ariaLabel="Filters">
        <Chip label="Send" />
        <Chip label="Split" />
        <Chip label="Bills" />
        <Chip label="Insurance" />
      </ChipList>,
    );

    // Not expanded yet, so Show less shouldn't be there
    expect(screen.queryByText("Show less")).not.toBeInTheDocument();
  });
});
