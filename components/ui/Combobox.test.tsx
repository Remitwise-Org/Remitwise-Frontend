// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { Combobox, ComboboxOption } from "@/components/ui/Combobox";

expect.extend(toHaveNoViolations);

const options: ComboboxOption[] = [
  { value: "usd", label: "US Dollar", description: "United States" },
  { value: "eur", label: "Euro", description: "European Union" },
  { value: "gbp", label: "British Pound", description: "United Kingdom" },
  { value: "inr", label: "Indian Rupee", description: "India", disabled: true },
];

describe("Combobox – Accessibility", () => {
  it("should have no axe violations when closed", async () => {
    const { container } = render(
      <Combobox label="Select currency" options={options} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no axe violations when open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Combobox label="Select currency" options={options} />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have role='combobox' on the input", () => {
    render(<Combobox label="Select currency" options={options} />);
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
  });

  it("should have aria-expanded='false' when closed", () => {
    render(<Combobox label="Select currency" options={options} />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("should have aria-expanded='true' when open", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("should have aria-autocomplete='list'", () => {
    render(<Combobox label="Select currency" options={options} />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("should link aria-controls to the listbox", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    const listbox = screen.getByRole("listbox");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
  });

  it("should have role='listbox' on the dropdown", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("should render options with role='option'", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    await user.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    const opts = within(listbox).getAllByRole("option");
    expect(opts.length).toBe(4);
  });

  it("should announce result count via aria-live region", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    await user.click(screen.getByRole("combobox"));
    // The live region should exist
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it("should set aria-disabled='true' on disabled input", () => {
    render(<Combobox label="Select currency" options={options} disabled />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-disabled", "true");
    expect(input).toBeDisabled();
  });
});

describe("Combobox – Keyboard Navigation", () => {
  it("should open listbox on ArrowDown", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    const input = screen.getByRole("combobox");
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("should open listbox on ArrowUp", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    const input = screen.getByRole("combobox");
    await user.tab();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("should close listbox on Escape", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("should select option on Enter when an option is active", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Combobox label="Select currency" options={options} onChange={onChange} />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(
      "usd",
      expect.objectContaining({ value: "usd" }),
    );
  });

  it("should move active option with ArrowDown/ArrowUp", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    // open() sets activeIndex to 0 (usd), ArrowDown moves to 1 (eur)
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      expect.stringContaining("eur"),
    );
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      expect.stringContaining("usd"),
    );
  });

  it("should move to first option on Home", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{ArrowDown}{ArrowDown}{Home}");
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-activedescendant",
      expect.stringContaining("usd"),
    );
  });

  it("should move to last option on End", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{End}");
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-activedescendant",
      expect.stringContaining("gbp"),
    );
  });

  it("should skip disabled options when navigating with arrows", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    await user.click(screen.getByRole("combobox"));
    // Navigate to gbp (index 2), then ArrowDown should skip inr (disabled, index 3)
    await user.keyboard("{End}");
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-activedescendant",
      expect.stringContaining("gbp"),
    );
  });
});

describe("Combobox – Selection", () => {
  it("should select an option on click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Combobox label="Select currency" options={options} onChange={onChange} />,
    );
    await user.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    const eurOption = within(listbox).getByText("Euro");
    await user.click(eurOption);
    expect(onChange).toHaveBeenCalledWith(
      "eur",
      expect.objectContaining({ value: "eur" }),
    );
  });

  it("should display selected option label in input", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    await user.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    const eurOption = within(listbox).getByText("Euro");
    await user.click(eurOption);
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("Euro");
  });

  it("should not allow selecting disabled options", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Combobox label="Select currency" options={options} onChange={onChange} />,
    );
    await user.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    const inrOption = within(listbox).getByText("Indian Rupee");
    await user.click(inrOption);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Combobox – Clearing", () => {
  it("should clear selection when clear button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        label="Select currency"
        options={options}
        defaultValue="usd"
      />,
    );
    // The clear button should be visible
    const clearBtn = screen.getByText("×");
    await user.click(clearBtn);
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("");
  });

  it("should not show clear button when clearable is false", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        label="Select currency"
        options={options}
        clearable={false}
        defaultValue="usd"
      />,
    );
    expect(screen.queryByText("×")).not.toBeInTheDocument();
  });
});

describe("Combobox – Filtering", () => {
  it("should filter options based on input text", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "euro");
    const listbox = screen.getByRole("listbox");
    const opts = within(listbox).getAllByRole("option");
    expect(opts.length).toBe(1);
    expect(opts[0]).toHaveTextContent("Euro");
  });

  it("should show empty state when no options match", async () => {
    const user = userEvent.setup();
    render(<Combobox label="Select currency" options={options} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "zzzzz");
    const listbox = screen.getByRole("listbox");
    const empty = within(listbox).getByText("No results found");
    expect(empty).toBeInTheDocument();
  });
});

describe("Combobox – Controlled mode", () => {
  it("should use the controlled value", () => {
    render(
      <Combobox label="Select currency" options={options} value="eur" />,
    );
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("Euro");
  });

  it("should call onChange in controlled mode", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Combobox
        label="Select currency"
        options={options}
        value={null}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    await user.click(within(listbox).getByText("US Dollar"));
    expect(onChange).toHaveBeenCalledWith(
      "usd",
      expect.objectContaining({ value: "usd" }),
    );
  });
});
