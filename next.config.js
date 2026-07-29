const { withSentryConfig } = require("@sentry/nextjs");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Issue #1437 – the bundle-size measurement workflow builds with
  // CI_SKIP_TYPECHECK=1: bundle size is orthogonal to the repo's known
  // type-error backlog (tracked separately), and measurement must not be
  // hostage to it. Default builds still typecheck.
  typescript: {
    ignoreBuildErrors: process.env.CI_SKIP_TYPECHECK === "1",
  },
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
