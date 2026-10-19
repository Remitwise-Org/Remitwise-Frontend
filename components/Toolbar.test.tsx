import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Toolbar from "@/components/Toolbar";
import { renderWithProviders } from "@/tests/react/renderWithProviders";

describe("Toolbar", () => {
  it("renders children", () => {
    renderWithProviders(
      <Toolbar>
        <button type="button">Action</button>
      </Toolbar>,
    );

    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("has toolbar role with horizontal orientation", () => {
    renderWithProviders(
      <Toolbar>
        <button type="button">Action</button>
      </Toolbar>,
    );

    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("renders density toggle button", () => {
    renderWithProviders(
      <Toolbar>
        <button type="button">Action</button>
      </Toolbar>,
    );

    expect(
      screen.getByRole("button", { name: /switch to (compact|comfortable) view/i }),
    ).toBeInTheDocument();
  });

  it("defaults to comfortable mode from context", () => {
    renderWithProviders(
      <Toolbar>
        <button type="button">Action</button>
      </Toolbar>,
      { density: "comfortable" },
    );

    const toggle = screen.getByRole("button", {
      name: /switch to compact view/i,
    });
    expect(toggle).toBeInTheDocument();
  });

  it("uses provided density prop over context", () => {
    renderWithProviders(
      <Toolbar density="compact">
        <button type="button">Action</button>
      </Toolbar>,
      { density: "comfortable" },
    );

    const toggle = screen.getByRole("button", {
      name: /switch to comfortable view/i,
    });
    expect(toggle).toBeInTheDocument();
  });

  it("toggles density on button click", () => {
    renderWithProviders(
      <Toolbar>
        <button type="button">Action</button>
      </Toolbar>,
      { density: "comfortable" },
    );

    const toggle = screen.getByRole("button", {
      name: /switch to compact view/i,
    });
    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", {
        name: /switch to comfortable view/i,
      }),
    ).toBeInTheDocument();
  });

  it("applies compact classes when in compact mode", () => {
    const { container } = renderWithProviders(
      <Toolbar density="compact">
        <button type="button">Action</button>
      </Toolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar.className).toContain("gap-space-xs");
    expect(toolbar.className).toContain("p-space-xs");
  });

  it("applies comfortable classes when in comfortable mode", () => {
    const { container } = renderWithProviders(
      <Toolbar density="comfortable">
        <button type="button">Action</button>
      </Toolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar.className).toContain("gap-space-sm");
    expect(toolbar.className).toContain("p-space-sm");
  });

  it("applies additional className", () => {
    const { container } = renderWithProviders(
      <Toolbar className="my-custom-class">
        <button type="button">Action</button>
      </Toolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar.className).toContain("my-custom-class");
  });

  it("density toggle has aria-pressed reflecting current state", () => {
    renderWithProviders(
      <Toolbar density="compact">
        <button type="button">Action</button>
      </Toolbar>,
    );

    const toggle = screen.getByRole("button", {
      name: /switch to comfortable view/i,
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("density toggle sets aria-pressed to false in comfortable mode", () => {
    renderWithProviders(
      <Toolbar>
        <button type="button">Action</button>
      </Toolbar>,
      { density: "comfortable" },
    );

    const toggle = screen.getByRole("button", {
      name: /switch to compact view/i,
    });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("wraps content on small viewports with flex-wrap", () => {
    const { container } = renderWithProviders(
      <Toolbar>
        <button type="button">Action 1</button>
        <button type="button">Action 2</button>
      </Toolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar.className).toContain("flex-wrap");
  });
});
