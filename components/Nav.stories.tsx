import type { Meta, StoryObj } from "@storybook/react";
import { within, expect } from "@storybook/test";
import { Nav } from "./Nav";

const meta: Meta<typeof Nav> = {
  title: "Components/Nav",
  component: Nav,
};

export default meta;
type Story = StoryObj<typeof Nav>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dashboard = canvas.getByText("Dashboard");
    await expect(dashboard).toBeVisible();
  },
};

export const ActiveSendMoney: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sendLink = canvas.getByText("Send Money");
    await expect(sendLink).toBeVisible();
  },
};