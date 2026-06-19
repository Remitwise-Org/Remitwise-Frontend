const { withSentryConfig } = require("@sentry/nextjs");

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

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: !process.env.CI,

  tunnelRoute: "/monitoring",

  hideSourceMaps: true,

  disableLogger: true,
};

module.exports = withSentryConfig(
  { ...nextConfig, rewrites },
  sentryWebpackPluginOptions
);
