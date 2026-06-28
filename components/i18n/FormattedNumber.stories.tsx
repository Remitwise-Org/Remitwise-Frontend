/**
 * Storybook story for `<FormattedNumber>`.
 *
 * Kept in a dedicated file so each `.stories.tsx` registers exactly one
 * component, matching the per-component convention already used by
 * `components/Toast.stories.tsx` and `components/Nav.stories.tsx`.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { FormattedNumber } from "./FormattedNumber";

const meta = {
  title: "Components/Locale/FormattedNumber",
  component: FormattedNumber,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 24, fontFamily: "monospace", color: "white", background: "#0A0A0A" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormattedNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  args: {
    value: 1234567.89,
  },
};

export const Percent: Story = {
  args: {
    value: 0.42,
    style: "percent",
  },
};

export const StripZeros: Story = {
  args: {
    value: 5,
    stripTrailingZeros: true,
  },
};

export const SpanishOverride: Story = {
  args: {
    value: 1234567.89,
    locale: "es-ES",
  },
};
