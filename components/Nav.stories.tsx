import type { Meta, StoryObj } from "@storybook/react";
import { Nav } from "./Nav";

const meta: Meta<typeof Nav> = {
  title: "Components/Nav",
  component: Nav,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/dashboard",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Nav>;

export const Default: Story = {};

export const ActiveSendMoney: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/send",
      },
    },
  },
};