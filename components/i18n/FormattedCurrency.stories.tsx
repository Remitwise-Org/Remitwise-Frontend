/**
 * Storybook story for `<FormattedCurrency>`.
 *
 * The companion `<FormattedNumber>` story is in a sibling file so each
 * `.stories.tsx` registers exactly one component (matching the per-component
 * convention used by `components/Toast.stories.tsx` and
 * `components/Nav.stories.tsx`).
 *
 * Storybook is optional for the build; the file is plain TypeScript, so
 * `tsc` and the production build pass either way.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { FormattedCurrency } from "./FormattedCurrency";

const meta = {
  title: "Components/Locale/FormattedCurrency",
  component: FormattedCurrency,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  argTypes: {
    value: { control: { type: "number" } },
    currency: { control: { type: "text" } },
    locale: { control: { type: "text" } },
    minimumFractionDigits: { control: { type: "number" } },
    maximumFractionDigits: { control: { type: "number" } },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 24, fontFamily: "monospace", color: "white", background: "#0A0A0A" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormattedCurrency>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UsdDefault: Story = {
  args: {
    value: 1234.5,
    currency: "USD",
  },
};

export const StablecoinFallback: Story = {
  args: {
    value: 1234.5,
    currency: "USDC",
  },
};

export const ZeroValue: Story = {
  args: {
    value: 0,
    currency: "USD",
  },
};

export const NegativeValue: Story = {
  args: {
    value: -45.67,
    currency: "USD",
  },
};

export const SpanishLocaleOverride: Story = {
  args: {
    value: 1234.5,
    currency: "USD",
    locale: "es-ES",
  },
};

export const RoundToWholeUnit: Story = {
  args: {
    value: 1850.75,
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  },
};
