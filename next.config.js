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

// Unversioned `/api/*` calls are aliased to `/api/v1/*`. These run as
// `fallback` rewrites so every real route -- including dynamic ones such as
// /api/v1/tutorials/[tutorialId]/progress -- is matched first; as a plain
// (afterFiles) rewrite it ran before dynamic routes and turned them into
// /api/v1/v1/... 404s.
const rewrites = async () => {
  return {
    beforeFiles: [],
    afterFiles: [],
    fallback: [
      {
        source: "/api/:path((?!v1/).*)",
        destination: "/api/v1/:path",
      },
    ],
  };
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
