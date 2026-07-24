import type { StorybookConfig } from "@storybook/react-webpack5";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    "../components/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-webpack5-compiler-babel",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  staticDirs: ["../public"],
  babel: async (config) => ({
    ...config,
    presets: [
      ...(config.presets || []),
      ["@babel/preset-env", { targets: { esmodules: true } }],
      ["@babel/preset-react", { runtime: "automatic" }],
      "@babel/preset-typescript",
    ],
  }),
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
