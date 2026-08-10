/**
 * Component test for ProfileSection.
 * Missing translation keys fall back to the key path verbatim.
 */

import React from "react";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/tests/react/renderWithProviders";
import { ProfileSection } from "./ProfileSection";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/validation/fileSize";

// FileReader is not implemented in jsdom; stub the read path so the happy-path
// (valid image) test can observe the preview callback without a real reader.
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL() {
    this.result = "data:image/png;base64,AAAA";
    this.onload?.();
  }
}

function makeFile(size: number, type = "image/png", name = "avatar.png"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("ProfileSection", () => {
  beforeAll(() => {
    vi.stubGlobal("FileReader", MockFileReader);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("renders inside a section with the profile id (scroll-spy target)", () => {
    renderWithProviders(<ProfileSection />);
    expect(document.getElementById("profile")).toBeInTheDocument();
  });

  it("renders the header and avatar controls", () => {
    renderWithProviders(<ProfileSection />);
    expect(
      screen.getByRole("heading", { name: "settings.profile.title" }),
    ).toBeInTheDocument();
    expect(screen.getByText("AO")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "settings.profile.change_avatar_label" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("avatar-file-input")).toBeInTheDocument();
  });

  it("rejects a file over the 25 MiB cap and surfaces the error", async () => {
    renderWithProviders(<ProfileSection />);
    const input = screen.getByTestId("avatar-file-input") as HTMLInputElement;

    const oversized = makeFile(MAX_UPLOAD_SIZE_BYTES + 1);
    fireEvent.change(input, { target: { files: [oversized] } });

    await waitFor(() => {
      expect(
        screen.getByRole("alert"),
      ).toHaveTextContent("settings.profile.avatar_too_large");
    });
  });

  it("accepts a valid image file and shows a local preview", async () => {
    renderWithProviders(<ProfileSection />);
    const input = screen.getByTestId("avatar-file-input") as HTMLInputElement;

    const valid = makeFile(1024);
    fireEvent.change(input, { target: { files: [valid] } });

    await waitFor(() => {
      // The FileReader mock should trigger the preview image
      const img = document.querySelector("img");
      expect(img).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects a non-image MIME type even when under the size cap", async () => {
    renderWithProviders(<ProfileSection />);
    const input = screen.getByTestId("avatar-file-input") as HTMLInputElement;

    const notImage = makeFile(1024, "application/pdf", "doc.pdf");
    fireEvent.change(input, { target: { files: [notImage] } });

    await waitFor(() => {
      expect(
        screen.getByRole("alert"),
      ).toHaveTextContent("settings.profile.avatar_invalid_type");
    });
  });

  it("renders the prefilled profile fields including the disabled stellar key", () => {
    renderWithProviders(<ProfileSection />);
    expect(screen.getByDisplayValue("Amara Osei")).toBeInTheDocument();
    expect(screen.getByDisplayValue("amara@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+234 801 234 5678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("GBQWY...K3PT")).toBeDisabled();
  });

  it("renders a save button", () => {
    renderWithProviders(<ProfileSection />);
    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).toBeInTheDocument();
  });
});
