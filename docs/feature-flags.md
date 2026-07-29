# Feature flags on the client

Audience: contributors adding, reading, or gating behind a feature flag.

This app has two independent feature-flag mechanisms. They look similar
(both are `NEXT_PUBLIC_*` env vars) but serve different purposes and use
opposite default semantics — mixing them up is the most common mistake.

## Why `NEXT_PUBLIC_`

Any flag read in a Client Component must use a `NEXT_PUBLIC_`-prefixed env
var. Next.js only inlines `NEXT_PUBLIC_*` variables into the client bundle
at build time; a plain `process.env.FOO` read from client code is
`undefined` in the browser no matter what the server's environment has set.
Both mechanisms below follow this rule.

## 1. Route flags — `lib/config/features.ts`

Gates entire pages/routes behind a flag. **Opt-in**: a flag is off unless
its env var is exactly `"true"`.

```ts
export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  {
    key: 'SWAP_PAGE',
    label: 'Swap Page',
    description: 'Enable the new currency swap page mock',
    routes: ['/swap'],
    envVar: 'NEXT_PUBLIC_SWAP_PAGE_ENABLED',
  },
  // ...
]

export function isFeatureEnabled(flag: FeatureFlagDefinition): boolean {
  return process.env[flag.envVar] === 'true'
}
```

Consumers:
- **Page gating** — `app/swap/page.tsx` looks up its own flag by key and
  renders a "not available" state when it's off:
  ```ts
  const swapFlag = FEATURE_FLAGS.find((f) => f.key === "SWAP_PAGE");
  const isSwapEnabled = swapFlag ? isFeatureEnabled(swapFlag) : false;
  ```
- **Dev banner** — `components/FeatureFlagIndicator.tsx` calls
  `getActiveFlagsForRoute(pathname)` and renders a small badge per active
  flag, but only when `NODE_ENV === "development"`; it renders nothing in
  production regardless of flag state.

**Adding one:** add an entry to `FEATURE_FLAGS`, set the env var in
`.env.local`, restart the dev server.

## 2. System flags — `lib/config/diagnostics.ts`

Broader module-level flags (`custodialMode`, `developerMode`,
`sentryMonitoring`, `recurringRemittance`, `emergencyTransfer`,
`familyWallet`, `insurance`, `savingsGoals`, `splitTransactions`), read via
`getFeatureFlags(): FeatureFlags`. **Mostly opt-out**: every flag except
`custodialMode`/`developerMode`/`sentryMonitoring` defaults to **on**
(`!== "false"`) — the env var exists to *disable* a shipped feature, not
enable an unshipped one.

```ts
recurringRemittance:
  process.env.NEXT_PUBLIC_FEATURE_RECURRING_REMITTANCE !== "false",
```

Consumer: `app/debug/page.tsx` renders the full snapshot (via
`getDiagnosticsSnapshot()`, which wraps `getFeatureFlags()`) in the
`/debug` diagnostics panel, for confirming what's actually live in a given
deploy.

**Adding one:** add the field to the `FeatureFlags` interface and a line in
`getFeatureFlags()`; decide deliberately whether it should default on
(`!== "false"`, for a shipped feature with a kill switch) or off
(`=== "true"`, for something still being built).

## Picking a mechanism

| Need | Use |
| --- | --- |
| Hide/show an entire route during development | `lib/config/features.ts` |
| A kill switch for a shipped feature, visible in `/debug` | `lib/config/diagnostics.ts` |
