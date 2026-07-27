import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Combobox, ComboboxOption } from "./Combobox";
import { Globe, CreditCard, Wallet, Landmark } from "lucide-react";

const sampleOptions: ComboboxOption[] = [
  { value: "usd", label: "US Dollar", description: "United States", icon: <Globe className="h-4 w-4" /> },
  { value: "eur", label: "Euro", description: "European Union", icon: <Globe className="h-4 w-4" /> },
  { value: "gbp", label: "British Pound", description: "United Kingdom", icon: <Globe className="h-4 w-4" /> },
  { value: "inr", label: "Indian Rupee", description: "India", icon: <Globe className="h-4 w-4" /> },
  { value: "php", label: "Philippine Peso", description: "Philippines", icon: <Globe className="h-4 w-4" /> },
  { value: "ngn", label: "Nigerian Naira", description: "Nigeria", icon: <Globe className="h-4 w-4" /> },
];

const meta: Meta<typeof Combobox> = {
  title: "UI/Combobox",
  component: Combobox,
  parameters: {
    docs: {
      description: {
        component:
          "A fully accessible single-select combobox following the WAI-ARIA 1.2 combobox pattern. " +
          "Full keyboard navigation, screen-reader semantics, and customisable filtering. " +
          "Meets WCAG 2.1 AA: 44px touch targets, visible focus rings, ARIA attributes, and live-region announcements.",
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    showSearchIcon: { control: "boolean" },
    clearable: { control: "boolean" },
    openOnFocus: { control: "boolean" },
    maxHeight: { control: { type: "number", min: 100, max: 600 } },
  },
};

export default meta;
type Story = StoryObj<typeof Combobox>;

// ──────────────────────────────────────────────────────────────────────────
// Default
// ──────────────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    label: "Select currency",
    placeholder: "Search currencies…",
    options: sampleOptions,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Controlled
// ──────────────────────────────────────────────────────────────────────────

function ControlledExample() {
  const [value, setValue] = useState<string | null>("usd");

  return (
    <div className="w-full max-w-sm space-y-2">
      <Combobox
        label="Select currency"
        placeholder="Search currencies…"
        options={sampleOptions}
        value={value}
        onChange={(v) => setValue(v)}
      />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Selected: <code className="text-indigo-600 dark:text-indigo-400">{value ?? "none"}</code>
      </p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
};

// ──────────────────────────────────────────────────────────────────────────
// Disabled
// ──────────────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  args: {
    label: "Select currency",
    placeholder: "Search currencies…",
    options: sampleOptions,
    disabled: true,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// With icons and descriptions
// ──────────────────────────────────────────────────────────────────────────

const paymentMethodOptions: ComboboxOption[] = [
  { value: "wallet", label: "Stellar Wallet", description: "Connect via Freighter", icon: <Wallet className="h-4 w-4" /> },
  { value: "card", label: "Debit Card", description: "Visa, Mastercard accepted", icon: <CreditCard className="h-4 w-4" /> },
  { value: "bank", label: "Bank Transfer", description: "ACH / Wire transfer", icon: <Landmark className="h-4 w-4" /> },
];

export const WithIcons: Story = {
  args: {
    label: "Select payment method",
    placeholder: "Choose a method…",
    options: paymentMethodOptions,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// No search icon
// ──────────────────────────────────────────────────────────────────────────

export const NoSearchIcon: Story = {
  args: {
    label: "Select currency",
    placeholder: "Search currencies…",
    options: sampleOptions,
    showSearchIcon: false,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// With disabled options
// ──────────────────────────────────────────────────────────────────────────

const optionsWithDisabled: ComboboxOption[] = [
  { value: "usd", label: "US Dollar", description: "United States" },
  { value: "eur", label: "Euro", description: "European Union" },
  { value: "gbp", label: "British Pound", description: "United Kingdom", disabled: true },
  { value: "inr", label: "Indian Rupee", description: "India" },
  { value: "jpy", label: "Japanese Yen", description: "Japan", disabled: true },
];

export const WithDisabledOptions: Story = {
  args: {
    label: "Select currency",
    placeholder: "Search currencies…",
    options: optionsWithDisabled,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────────────────────────────────

export const EmptyState: Story = {
  args: {
    label: "Select currency",
    placeholder: "Search currencies…",
    options: [],
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Many options (scrollable)
// ──────────────────────────────────────────────────────────────────────────

const manyOptions: ComboboxOption[] = Array.from({ length: 50 }, (_, i) => ({
  value: `opt-${i}`,
  label: `Option ${i + 1}`,
  description: `Description for option ${i + 1}`,
}));

export const ManyOptions: Story = {
  args: {
    label: "Select an option",
    placeholder: "Type to filter…",
    options: manyOptions,
    maxHeight: 240,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Keyboard focus accessibility demo
// ──────────────────────────────────────────────────────────────────────────

export const KeyboardAccessible: Story = {
  render: () => (
    <div className="space-y-6 p-4">
      <p className="text-sm text-gray-400">
        Tab to focus the input. Type to filter. Arrow keys to navigate.
        Enter to select. Escape to close.
      </p>
      <Combobox
        label="Select currency"
        placeholder="Type to filter…"
        options={sampleOptions}
      />
    </div>
  ),
};
