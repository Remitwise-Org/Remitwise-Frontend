import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton } from "./Skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    variant: {
      control: { type: "radio" },
      options: ["shimmer", "static"],
      description:
        "`shimmer` animates and silently falls back to the static rendering under `prefers-reduced-motion: reduce`. `static` never animates.",
    },
    className: { control: { type: "text" } },
  },
  args: {
    className: "h-6 w-64 rounded",
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default rendering: a highlight sweeps across the placeholder. */
export const Shimmer: Story = {
  args: { variant: "shimmer" },
};

/** Flat fill, never animated, whatever the user's motion setting is. */
export const Static: Story = {
  args: { variant: "static" },
};

/**
 * Both variants side by side. Turn on "Reduce motion" in your OS accessibility
 * settings and reload — the shimmer row should become indistinguishable from
 * the static row.
 */
export const ShimmerVersusStatic: Story = {
  render: (args) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-white/50">shimmer</p>
        <Skeleton {...args} variant="shimmer" />
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-white/50">static</p>
        <Skeleton {...args} variant="static" />
      </div>
    </div>
  ),
};

/** The shapes a placeholder is usually composed of. */
export const Shapes: Story = {
  render: (args) => (
    <div className="flex items-center gap-4">
      <Skeleton {...args} className="h-12 w-12 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton {...args} className="h-4 w-2/3 rounded" />
        <Skeleton {...args} className="h-3 w-1/3 rounded" />
      </div>
      <Skeleton {...args} className="h-6 w-20 rounded-full" />
    </div>
  ),
};
