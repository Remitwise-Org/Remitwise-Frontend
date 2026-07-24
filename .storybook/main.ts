import type { StorybookConfig } from "@storybook/react-webpack5";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    "../components/**/*.stories.@(ts|tsx)",
  ],
  addons: [],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  staticDirs: ["../public"],
  typescript: {
    reactDocgen: "react-docgen",
  },
  webpackFinal: async (baseConfig) => {
    baseConfig.resolve = baseConfig.resolve || {};
    baseConfig.resolve.alias = {
      ...baseConfig.resolve.alias,
      "@": path.resolve(dirname, ".."),
    };
    return baseConfig;
  },
};

export default config;
