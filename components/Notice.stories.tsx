import type { Meta, StoryObj } from "@storybook/react";
import Notice from "./Notice";

const meta: Meta<typeof Notice> = {
  title: "Components/Notice",
  component: Notice,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "warning", "error", "success"],
    },
    onDismiss: { action: "dismissed" },
  },
};

export default meta;
type Story = StoryObj<typeof Notice>;

// ---------------------------------------------------------------------------
// All variants
// ---------------------------------------------------------------------------

export const Info: Story = {
  args: {
    variant: "info",
    title: "Read-only mode",
    children: "Your wallet is connected in read-only mode. Transactions are disabled.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Rates have changed",
    children:
      "Exchange rates have been updated since you started this transfer. Your quoted amount may differ.",
  },
};

export const Error: Story = {
  args: {
    variant: "error",
    title: "Transfer failed",
    children:
      "The transfer could not be completed due to insufficient funds. Please check your balance and try again.",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    title: "Payment sent",
    children: "Your payment of 50 USDC has been submitted to the Stellar network.",
  },
};

// ---------------------------------------------------------------------------
// With dismiss
// ---------------------------------------------------------------------------

export const Dismissible: Story = {
  args: {
    variant: "warning",
    title: "Pending KYC verification",
    children: "Your account is pending identity verification. Some features are limited.",
    onDismiss: () => {},
  },
};

// ---------------------------------------------------------------------------
// With action
// ---------------------------------------------------------------------------

export const WithAction: Story = {
  args: {
    variant: "error",
    title: "Transaction failed",
    children: "An error occurred while processing your request.",
    action: { label: "Retry", onClick: () => {} },
  },
};

// ---------------------------------------------------------------------------
// All features combined
// ---------------------------------------------------------------------------

export const FullFeatured: Story = {
  args: {
    variant: "info",
    title: "New feature available",
    children: "Smart money splitting is now available. Set allocation rules to automate your transfers.",
    onDismiss: () => {},
    action: { label: "Learn more", onClick: () => {} },
  },
};

// ---------------------------------------------------------------------------
// No title (body-only)
// ---------------------------------------------------------------------------

export const BodyOnly: Story = {
  args: {
    variant: "success",
    children: "Settings saved successfully.",
  },
};
