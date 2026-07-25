import type { StorybookConfig } from "@storybook/react-webpack5";
import path from "path";

const config: StorybookConfig = {
  stories: [
    // Include all component stories except Nav, which has heavy
    // app-level dependencies (Next.js router, wallet context, etc.)
    // that require a full Next.js runtime not available in Storybook
    // with the react-webpack5 builder. Add those back once mocks are in place.
    "../components/Notice.stories.@(ts|tsx)",
  ],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  webpackFinal: async (webpackConfig) => {
    // --- TypeScript support ---
    // Remove any existing ts/tsx rule that might conflict, then add ts-loader.
    webpackConfig.module = webpackConfig.module ?? { rules: [] };
    webpackConfig.module.rules = (webpackConfig.module.rules ?? []).filter(
      (rule) => {
        if (!rule || typeof rule !== "object" || !("test" in rule)) return true;
        const test = (rule as { test: unknown }).test;
        if (test instanceof RegExp) {
          return !test.source.includes("tsx") && !test.source.includes("ts");
        }
        return true;
      }
    );

    webpackConfig.module.rules.push({
      test: /\.tsx?$/,
      use: [
        {
          loader: require.resolve("ts-loader"),
          options: {
            transpileOnly: true, // type-checking happens in CI separately
            configFile: path.resolve(__dirname, "../tsconfig.json"),
          },
        },
      ],
      exclude: /node_modules/,
    });

    // --- @/ path alias (mirrors tsconfig paths) ---
    webpackConfig.resolve = webpackConfig.resolve ?? {};
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias ?? {}),
      "@": path.resolve(__dirname, ".."),
    };

    // Ensure .tsx / .ts extensions are resolved
    webpackConfig.resolve.extensions = [
      ...(webpackConfig.resolve.extensions ?? []),
      ".ts",
      ".tsx",
    ];

    return webpackConfig;
  },
};

export default config;
