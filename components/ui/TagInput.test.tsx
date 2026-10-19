import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "./TagInput";

async function typeAndEnter(input: HTMLElement, text: string, user: ReturnType<typeof userEvent.setup>) {
  await user.type(input, `${text}{Enter}`);
}

describe("TagInput", () => {
  it("adds a tag on Enter and clears the draft input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    await typeAndEnter(screen.getByRole("textbox"), "urgent", user);

    expect(onChange).toHaveBeenCalledWith(["urgent"]);
  });

  it("rejects a duplicate tag (case-insensitive) with a visible error", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["urgent"]} onChange={onChange} />);

    await typeAndEnter(screen.getByRole("textbox"), "URGENT", user);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent('"URGENT" is already added.');
  });

  it("removes a tag when its remove button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["urgent", "review"]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Remove urgent" }));

    expect(onChange).toHaveBeenCalledWith(["review"]);
  });

  it("shows the tag count against the cap", () => {
    render(<TagInput value={["a", "b"]} onChange={vi.fn()} maxTags={2} />);
    expect(screen.getByText("2/2 tags")).toBeInTheDocument();
  });

  it("rejects adding a tag once maxTags is reached, with a visible error", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["a", "b"]} onChange={onChange} maxTags={2} />);

    await typeAndEnter(screen.getByRole("textbox"), "c", user);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("You can add up to 2 tags.");
  });

  it("allows adding again after removing a tag brings the count back under the cap", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<TagInput value={["a", "b"]} onChange={onChange} maxTags={2} />);

    await user.click(screen.getByRole("button", { name: "Remove a" }));
    expect(onChange).toHaveBeenCalledWith(["b"]);

    rerender(<TagInput value={["b"]} onChange={onChange} maxTags={2} />);
    await typeAndEnter(screen.getByRole("textbox"), "c", user);

    expect(onChange).toHaveBeenCalledWith(["b", "c"]);
  });
});
