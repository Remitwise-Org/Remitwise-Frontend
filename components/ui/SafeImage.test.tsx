import { render } from "@testing-library/react";
import { SafeImage } from "./SafeImage";
import { describe, it, expect, vi } from "vitest";

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: any) => <image alt={props.alt || ""} {...props} />,
}));

describe("SafeImage", () => {
  it("renders with required alt attribute", () => {
    const { getByAltText } = render(
      <SafeImage src="/test.png" alt="Test image" width={100} height={100} />
    );
    expect(getByAltText("Test image")).toBeDefined();
  });

  it("applies loading='lazy' by default", () => {
    const { getByAltText } = render(
      <SafeImage src="/test.png" alt="Test image" width={100} height={100} />
    );
    const img = getByAltText("Test image");
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("allows overriding loading attribute", () => {
    const { getByAltText } = render(
      <SafeImage src="/test.png" alt="Test image" width={100} height={100} loading="eager" />
    );
    const img = getByAltText("Test image");
    expect(img.getAttribute("loading")).toBe("eager");
  });
});
