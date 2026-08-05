import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
};

export default config;
