import type { Meta, StoryObj } from "@storybook/react";
import { Search, Filter, Download, Plus } from "lucide-react";
import Toolbar from "./Toolbar";

const meta = {
  title: "Components/Toolbar",
  component: Toolbar,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    density: {
      control: "radio",
      options: ["comfortable", "compact"],
    },
  },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

function ToolbarItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export const Default: Story = {
  args: {
    children: (
      <>
        <ToolbarItem icon={Search} label="Search" />
        <ToolbarItem icon={Filter} label="Filter" />
        <ToolbarItem icon={Download} label="Export" />
        <ToolbarItem icon={Plus} label="Add" />
      </>
    ),
  },
};

export const Compact: Story = {
  args: {
    density: "compact",
    children: (
      <>
        <ToolbarItem icon={Search} label="Search" />
        <ToolbarItem icon={Filter} label="Filter" />
        <ToolbarItem icon={Download} label="Export" />
        <ToolbarItem icon={Plus} label="Add" />
      </>
    ),
  },
};

export const SingleItem: Story = {
  args: {
    children: <ToolbarItem icon={Search} label="Search" />,
  },
};

export const ManyItems: Story = {
  args: {
    children: (
      <>
        <ToolbarItem icon={Search} label="Search" />
        <ToolbarItem icon={Filter} label="Filter" />
        <ToolbarItem icon={Download} label="Export" />
        <ToolbarItem icon={Plus} label="Add" />
        <ToolbarItem icon={Download} label="Import" />
        <ToolbarItem icon={Filter} label="Sort" />
        <ToolbarItem icon={Plus} label="New" />
        <ToolbarItem icon={Search} label="Find" />
      </>
    ),
  },
};
