/**
 * Component tests for the shared Settings primitives.
 * The app ships no `settings.*` translations, so useClientTranslator falls back
 * to returning the key path verbatim — assertions target those keys.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { User } from "lucide-react";
import { renderWithProviders } from "@/tests/react/renderWithProviders";
import {
  SectionCard,
  SectionHeader,
  FieldRow,
  TextInput,
  Toggle,
  SaveButton,
} from "./SettingsPrimitives";

describe("Settings primitives", () => {
  describe("SectionCard", () => {
    it("renders a section with the given id and children", () => {
      renderWithProviders(
        <SectionCard id="profile">
          <p>card body</p>
        </SectionCard>,
      );
      const section = document.getElementById("profile");
      expect(section).toBeInTheDocument();
      expect(section?.tagName).toBe("SECTION");
      expect(screen.getByText("card body")).toBeInTheDocument();
    });
  });

  describe("SectionHeader", () => {
    it("renders the title as a heading and the description", () => {
      renderWithProviders(
        <SectionHeader
          icon={User}
          titleKey="settings.profile.title"
          descriptionKey="settings.profile.description"
        />,
      );
      expect(
        screen.getByRole("heading", { name: "settings.profile.title" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("settings.profile.description"),
      ).toBeInTheDocument();
    });
  });

  describe("FieldRow", () => {
    it("renders label, optional hint and children", () => {
      renderWithProviders(
        <FieldRow
          labelKey="settings.profile.full_name_label"
          hintKey="settings.profile.full_name_hint"
        >
          <span>field child</span>
        </FieldRow>,
      );
      expect(
        screen.getByText("settings.profile.full_name_label"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("settings.profile.full_name_hint"),
      ).toBeInTheDocument();
      expect(screen.getByText("field child")).toBeInTheDocument();
    });

    it("omits the hint when no hintKey is provided", () => {
      renderWithProviders(
        <FieldRow labelKey="settings.wallet.auto_split_label">
          <span>x</span>
        </FieldRow>,
      );
      expect(
        screen.queryByText("settings.wallet.auto_split_hint"),
      ).not.toBeInTheDocument();
    });
  });

  describe("TextInput", () => {
    it("renders an input with the default value and type", () => {
      renderWithProviders(
        <TextInput type="email" defaultValue="amara@example.com" />,
      );
      const input = screen.getByDisplayValue("amara@example.com");
      expect(input).toHaveAttribute("type", "email");
      expect(input).not.toBeDisabled();
    });

    it("can be disabled and uses a translated placeholder", () => {
      renderWithProviders(
        <TextInput
          disabled
          placeholderKey="settings.profile.full_name_placeholder"
        />,
      );
      const input = screen.getByPlaceholderText(
        "settings.profile.full_name_placeholder",
      );
      expect(input).toBeDisabled();
    });
  });

  describe("Toggle", () => {
    it("renders as a switch reflecting defaultChecked", () => {
      renderWithProviders(
        <Toggle
          labelKey="settings.notifications.email_channel"
          defaultChecked
        />,
      );
      expect(screen.getByRole("switch")).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    it("flips its state when clicked (uncontrolled)", () => {
      renderWithProviders(
        <Toggle labelKey="settings.notifications.sms_channel" />,
      );
      const sw = screen.getByRole("switch");
      expect(sw).toHaveAttribute("aria-checked", "false");
      fireEvent.click(sw);
      expect(sw).toHaveAttribute("aria-checked", "true");
    });

    it("calls onChange and stays controlled when checked is provided", () => {
      const onChange = vi.fn();
      renderWithProviders(
        <Toggle
          labelKey="settings.security.two_factor_label"
          checked={false}
          onChange={onChange}
        />,
      );
      const sw = screen.getByRole("switch");
      fireEvent.click(sw);
      expect(onChange).toHaveBeenCalledWith(true);
      // controlled: stays false until parent updates the prop
      expect(sw).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("SaveButton", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("renders the translated label and transitions through saving -> saved", () => {
      renderWithProviders(<SaveButton labelKey="settings.save_changes" />);
      const button = screen.getByRole("button", {
        name: "settings.save_changes",
      });
      expect(button).toBeInTheDocument();

      act(() => {
        fireEvent.click(button);
      });
      // saving: disabled while the timer runs
      expect(button).toBeDisabled();

      act(() => {
        vi.advanceTimersByTime(800);
      });
      // saved state re-enables the button
      expect(button).not.toBeDisabled();
    });
  });
});
