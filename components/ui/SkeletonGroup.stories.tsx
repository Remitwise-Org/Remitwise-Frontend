import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton, SkeletonGroup } from "./Skeleton";

const meta = {
  title: "UI/SkeletonGroup",
  component: SkeletonGroup,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    label: {
      control: { type: "text" },
      description:
        "Announced by screen readers while the placeholder is on screen. Name the surface being loaded.",
    },
  },
  args: {
    label: "Loading transaction history",
  },
} satisfies Meta<typeof SkeletonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A placeholder list wrapped in the live region. The shapes themselves are
 * `aria-hidden`; the only thing announced is the group's label.
 */
export const Default: Story = {
  args: {
    className: "space-y-3",
    children: (
      <>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-5"
          >
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
            <Skeleton className="h-5 w-16 rounded" />
          </div>
        ))}
      </>
    ),
  },
};

/** The static variant, for surfaces that should never animate. */
export const StaticShapes: Story = {
  args: {
    label: "Loading balances",
    className: "grid gap-4 sm:grid-cols-3",
    children: (
      <>
        {[0, 1, 2].map((cell) => (
          <div key={cell} className="space-y-2 rounded-2xl border border-white/5 p-5">
            <Skeleton variant="static" className="h-4 w-24 rounded" />
            <Skeleton variant="static" className="h-8 w-32 rounded" />
          </div>
        ))}
      </>
    ),
  },
};
