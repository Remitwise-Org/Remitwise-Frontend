const { withSentryConfig } = require("@sentry/nextjs");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

const rewrites = async () => {
  return [
    {
      source: "/api/:path*",
      destination: "/api/v1/:path*",
    },
  ];
};

// Insights routes consolidated into the canonical /financial-insights page.
// Permanent (308) redirects keep existing bookmarks/links alive.
const redirects = async () => {
  return [
    {
      source: "/insights",
      destination: "/financial-insights",
      permanent: true,
    },
    {
      source: "/financial-insight",
      destination: "/financial-insights",
      permanent: true,
    },
  ];
};

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: !process.env.CI,

  tunnelRoute: "/monitoring",

  hideSourceMaps: true,

  disableLogger: true,
};

module.exports = withBundleAnalyzer(
  withSentryConfig(
    { ...nextConfig, rewrites, redirects },
    sentryWebpackPluginOptions
  )
);
