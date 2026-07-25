/**
 * Feature flag definitions for the app.
 *
 * Each flag maps to a `NEXT_PUBLIC_` environment variable and a set of
 * routes it affects.  The `<FeatureFlagIndicator />` component reads this
 * config to display a dev-only banner on flagged pages.
 *
 * Adding a new flag:
 *   1. Add an entry to the `FEATURE_FLAGS` array below.
 *   2. Set the corresponding env var (e.g. `NEXT_PUBLIC_MY_FLAG=true`)
 *      in `.env.local` during development.
 *   3. Restart the dev server.
 */

export interface FeatureFlagDefinition {
  /** Unique machine-readable key — used as the React key in the banner. */
  key: string
  /** Human-readable label shown in the dev banner. */
  label: string
  /** Short description of what the flag controls. */
  description: string
  /** Route prefixes that are gated by this flag. */
  routes: string[]
  /** The `NEXT_PUBLIC_` env var that toggles this flag. */
  envVar: string
}

export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  {
    key: 'SESSION_REFRESH',
    label: 'Session Refresh',
    description: 'Automatic session token refresh',
    routes: ['/dashboard', '/send', '/bills', '/insurance'],
    envVar: 'NEXT_PUBLIC_SESSION_REFRESH_ENABLED',
  },
]

/** Check whether a specific flag is enabled based on its env var. */
export function isFeatureEnabled(flag: FeatureFlagDefinition): boolean {
  return process.env[flag.envVar] === 'true'
}

/**
 * Return all flags that are both enabled and whose route prefixes match
 * the given `pathname`.
 */
export function getActiveFlagsForRoute(pathname: string): FeatureFlagDefinition[] {
  return FEATURE_FLAGS.filter((flag) => {
    if (!isFeatureEnabled(flag)) return false
    return flag.routes.some((route) => pathname === route || pathname.startsWith(route + '/'))
  })
}