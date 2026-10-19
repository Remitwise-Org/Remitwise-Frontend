import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PiggyBank } from "lucide-react";
import WidgetEmptyState from "@/components/ui/WidgetEmptyState";

describe("WidgetEmptyState", () => {
  const baseProps = {
    icon: PiggyBank,
    title: "No savings goals yet",
    description: "Create a goal to start tracking your progress.",
  };

  it("renders the icon, title, and description with no CTA", () => {
    render(<WidgetEmptyState {...baseProps} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(baseProps.title)).toBeInTheDocument();
    expect(screen.getByText(baseProps.description)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a link CTA when ctaHref is provided", () => {
    render(
      <WidgetEmptyState {...baseProps} ctaLabel="Create a goal" ctaHref="/dashboard/goals/new" />
    );

    const link = screen.getByRole("link", { name: "Create a goal" });
    expect(link).toHaveAttribute("href", "/dashboard/goals/new");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a button CTA and calls onAction when clicked, instead of a link", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<WidgetEmptyState {...baseProps} ctaLabel="Create a goal" onAction={onAction} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create a goal" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
