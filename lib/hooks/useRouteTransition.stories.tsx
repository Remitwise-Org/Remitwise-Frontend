import type { Meta, StoryObj } from "@storybook/react";
import { useRouteTransition } from "./useRouteTransition";

function RouteTransitionExample({
  direction = "left",
  duration = 300,
  animateOnMount = true,
  label = "Page content",
}: {
  direction?: "left" | "right" | "top" | "bottom";
  duration?: 75 | 100 | 150 | 200 | 300 | 500 | 700 | 1000;
  animateOnMount?: boolean;
  label?: string;
}) {
  const { animationClasses, prefersReducedMotion } = useRouteTransition({
    direction,
    duration,
    animateOnMount,
    className: "rounded-xl border p-6",
  });

  return (
    <div>
      <div className="mb-4 text-sm text-gray-500">
        prefersReducedMotion: {String(prefersReducedMotion)}
      </div>
      <div className={animationClasses}>
        <h3 className="text-lg font-semibold">{label}</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          This container animates in using the classes returned by{" "}
          <code>useRouteTransition</code>. The animation is suppressed when the
          OS has <code>prefers-reduced-motion: reduce</code> active.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Classes: <code>{animationClasses || "(none)"}</code>
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: "Hooks/useRouteTransition",
  component: RouteTransitionExample,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Centralises page-transition animation logic. Returns CSS class names for a page container element and automatically disables animations when the user prefers reduced motion (WCAG 2.1 AA).",
      },
    },
  },
  argTypes: {
    direction: {
      control: "select",
      options: ["left", "right", "top", "bottom"],
    },
    duration: {
      control: "select",
      options: [75, 100, 150, 200, 300, 500, 700, 1000],
    },
    animateOnMount: { control: "boolean" },
    label: { control: "text" },
  },
} satisfies Meta<typeof RouteTransitionExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Default (slide from left, 300ms)",
  },
};

export const SlideFromRight: Story = {
  args: {
    direction: "right",
    label: "Slide from right",
  },
};

export const SlideFromTop: Story = {
  args: {
    direction: "top",
    label: "Slide from top",
  },
};

export const SlideFromBottom: Story = {
  args: {
    direction: "bottom",
    label: "Slide from bottom",
  },
};

export const Slow: Story = {
  args: {
    duration: 1000,
    label: "Slow animation (1000ms)",
  },
};

export const Fast: Story = {
  args: {
    duration: 75,
    label: "Fast animation (75ms)",
  },
};

export const ReducedMotion: Story = {
  args: {
    label: "No animation (simulated reduced motion)",
  },
  parameters: {
    a11y: {
      config: { disabled: false },
    },
  },
};
