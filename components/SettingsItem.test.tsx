import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SettingsItem from "./SettingsItem";

describe("SettingsItem", () => {
  it("marks coming-soon navigation items as disabled and prevents activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <SettingsItem
        title="Security alerts"
        description="Unavailable setting"
        comingSoon
        onClick={onClick}
      />,
    );

    const trigger = screen.getByRole("button", { name: /security alerts/i });

    expect(trigger).toHaveAttribute("aria-disabled", "true");
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();

    await user.click(trigger);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("allows the coming-soon label to be supplied by localized callers", () => {
    render(
      <SettingsItem
        title="Beta setting"
        comingSoon
        comingSoonLabel="Disponible pronto"
      />,
    );

    expect(screen.getByText("Disponible pronto")).toBeInTheDocument();
  });

  it("uses a real dropdown button with expanded state and controlled region", async () => {
    const user = userEvent.setup();

    render(
      <SettingsItem
        title="Currency preferences"
        type="dropdown"
        hasDropdownBar={false}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /currency preferences/i,
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls");
    expect(trigger).toHaveClass("focus-visible:ring-2");
    const region = document.getElementById(
      trigger.getAttribute("aria-controls") ?? "",
    );
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("hidden");

    trigger.focus();
    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(region).not.toHaveAttribute("hidden");

    await user.keyboard(" ");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(region).toHaveAttribute("hidden");
  });

  it("preserves switch semantics for toggle items", () => {
    render(
      <SettingsItem
        title="Payment reminders"
        type="toggle"
        enabled
        onToggle={() => undefined}
      />,
    );

    const toggle = screen.getByRole("switch");

    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});
