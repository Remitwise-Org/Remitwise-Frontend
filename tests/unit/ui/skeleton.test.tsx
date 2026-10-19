import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

import { Skeleton, SkeletonGroup, SkeletonCard } from "@/components/ui/Skeleton";

expect.extend(toHaveNoViolations);

/**
 * The shimmer is switched off for `prefers-reduced-motion: reduce` in CSS
 * (`app/globals.css`), which jsdom does not evaluate. These tests therefore
 * assert the contract the stylesheet keys off: which classes end up on the
 * element. The media query itself is covered by the Playwright a11y spec, which
 * runs with a real engine under `reducedMotion: "reduce"`.
 */
describe("Skeleton", () => {
  it("renders the shimmer variant by default", () => {
    const { container } = render(<Skeleton className="h-4 w-24 rounded" />);
    const el = container.firstElementChild as HTMLElement;

    expect(el).toHaveClass("rw-skeleton");
    expect(el).toHaveClass("rw-skeleton--shimmer");
  });

  it("omits the shimmer modifier for the static variant", () => {
    const { container } = render(<Skeleton variant="static" />);
    const el = container.firstElementChild as HTMLElement;

    expect(el).toHaveClass("rw-skeleton");
    expect(el).not.toHaveClass("rw-skeleton--shimmer");
  });

  it("keeps caller classes and inline styles", () => {
    const { container } = render(
      <Skeleton className="h-4 w-24 rounded" style={{ height: "42%" }} />,
    );
    const el = container.firstElementChild as HTMLElement;

    expect(el).toHaveClass("h-4", "w-24", "rounded");
    expect(el.style.height).toBe("42%");
  });

  it("is hidden from assistive technology, being decorative", () => {
    const { container } = render(<Skeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("does not hard-code colours, so theme tokens drive the fill", () => {
    const { container } = render(<Skeleton />);
    const className = (container.firstElementChild as HTMLElement).className;

    expect(className).not.toMatch(/white|black|#[0-9a-f]{3,8}/i);
  });
});

describe("SkeletonGroup", () => {
  it("announces the loading state politely", () => {
    render(
      <SkeletonGroup label="Loading transaction history">
        <Skeleton />
      </SkeletonGroup>,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading transaction history");
  });

  it("falls back to a generic label", () => {
    render(
      <SkeletonGroup>
        <Skeleton />
      </SkeletonGroup>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("keeps the label off-screen rather than visible", () => {
    render(<SkeletonGroup label="Loading bills">{null}</SkeletonGroup>);

    // `sr-only` is Tailwind's visually-hidden utility: present in the
    // accessibility tree, clipped out of the visual layout.
    expect(screen.getByText("Loading bills")).toHaveClass("sr-only");
  });

  it("forwards layout classes so wrapping does not change the layout", () => {
    const { container } = render(
      <SkeletonGroup className="space-y-8" label="Loading dashboard">
        <Skeleton />
      </SkeletonGroup>,
    );

    expect(container.firstElementChild).toHaveClass("space-y-8");
  });

  it("exposes exactly one live region so nesting cannot double-announce", () => {
    render(
      <SkeletonGroup label="Loading dashboard">
        <SkeletonCard variant="stat" />
        <SkeletonCard variant="chart" />
      </SkeletonGroup>,
    );

    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <SkeletonGroup className="space-y-4" label="Loading dashboard">
        <SkeletonCard variant="stat" />
        <SkeletonCard variant="chart" />
        <Skeleton variant="static" className="h-4 w-24 rounded" />
      </SkeletonGroup>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

/**
 * The reduce-motion fallback lives in the stylesheet, which jsdom never
 * evaluates, so assert on the source instead. Without this the shimmer could be
 * un-gated by an unrelated CSS edit and no other test would notice.
 */
describe("reduced-motion stylesheet contract", () => {
  const css = readFileSync(
    path.join(process.cwd(), "app", "globals.css"),
    "utf8",
  );

  function reducedMotionBlocks() {
    return css
      .split("@media (prefers-reduced-motion: reduce)")
      .slice(1)
      .map((chunk) => chunk.slice(0, chunk.indexOf("\n  }") + 4));
  }

  it("neutralises the shimmer under prefers-reduced-motion: reduce", () => {
    const shimmerBlock = reducedMotionBlocks().find((block) =>
      block.includes(".rw-skeleton--shimmer"),
    );

    expect(shimmerBlock).toBeDefined();
    expect(shimmerBlock).toMatch(/animation:\s*none/);
  });

  it("also drops the gradient, so the shimmer does not freeze mid-sweep", () => {
    const shimmerBlock = reducedMotionBlocks().find((block) =>
      block.includes(".rw-skeleton--shimmer"),
    );

    expect(shimmerBlock).toMatch(/background-image:\s*none/);
  });

  it("paints both variants from theme tokens rather than literal colours", () => {
    const componentLayer = css.slice(css.indexOf(".rw-skeleton {"));
    const skeletonRules = componentLayer.slice(
      0,
      componentLayer.indexOf("@keyframes"),
    );

    expect(skeletonRules).toMatch(/var\(--skeleton-static\)/);
    expect(skeletonRules).toMatch(/var\(--skeleton-base\)/);
    expect(skeletonRules).toMatch(/var\(--skeleton-highlight\)/);
    expect(skeletonRules).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
  });
});
