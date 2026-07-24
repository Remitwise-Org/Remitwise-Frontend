import module from "node:module";

try {
  require.resolve("next/config");
} catch (e) {
  const Module = module.Module as any;
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (path: string) {
    if (path === "next/config") {
      return () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} });
    }
    return originalRequire.apply(this, arguments);
  };
}

import type { StorybookConfig } from "@storybook/nextjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    "../components/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ["../public"],
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