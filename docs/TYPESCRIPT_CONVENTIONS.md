# TypeScript Conventions

**Audience:** frontend contributors adding types, ambient declarations, or
discriminated unions in this Next.js codebase.

This guide captures three patterns that are easy to get wrong and hard to
rediscover from git history alone: **ambient types**, **module augmentation**,
and **never-narrow** prop / union design. Reviewers can check PRs against the
rules below; new contributors can copy the real entry-points instead of
inventing parallel conventions.

Related: [PROP_CONVENTIONS.md](./PROP_CONVENTIONS.md),
[FRONTEND_CONTRIBUTING.md](./FRONTEND_CONTRIBUTING.md).

---

## Table of Contents

1. [Ambient types](#ambient-types)
2. [Module augmentation](#module-augmentation)
3. [Never-narrow patterns](#never-narrow-patterns)
4. [Checklist for PRs](#checklist-for-prs)

---

## Ambient types

**Rule:** ambient declarations (`.d.ts` files and `declare global` blocks)
exist so TypeScript knows about values that appear at runtime without a normal
import. Prefer a dedicated ambient file under `types/` or `lib/types/` over
scattering `any` or silencing the compiler.

### When to add an ambient file

| Situation | Preferred location | Example in this repo |
| --- | --- | --- |
| Third-party package ships no (or broken) types | `types/<package>.d.ts` | [`types/swagger-ui-react.d.ts`](../types/swagger-ui-react.d.ts) |
| Process / HMR singleton on `globalThis` | `lib/types/global.d.ts` or next to the module that owns it | [`lib/types/global.d.ts`](../lib/types/global.d.ts), [`lib/db.ts`](../lib/db.ts) |
| Test-runner globals (`describe`, `expect`, …) | Test-only ambient / triple-slash refs | [`vitest-env.d.ts`](../vitest-env.d.ts) |

### Real entry-point: Prisma HMR singleton

`lib/db.ts` (and the matching ambient in `lib/types/global.d.ts`) declare a
global `prisma` so Next.js hot reload does not open a new `PrismaClient` on
every edit in development:

```ts
// lib/types/global.d.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export {};
```

```ts
// lib/db.ts — runtime owner of the singleton
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient(/* … */);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
```

Notes:

- Use `var` inside `declare global` (required for global ambient bindings).
- End ambient modules that import types with `export {}` so the file is treated
  as a module, not a script that pollutes the global scope unintentionally.
- Do **not** put app business types in ambient files; use normal
  `export type` / `export interface` under `types/` or next to the feature.

### Real entry-point: Vitest globals

`vitest.config.mts` enables `globals: true`. [`vitest-env.d.ts`](../vitest-env.d.ts)
exposes those globals to `tsc` via triple-slash references **without** setting
`compilerOptions.types` in `tsconfig.json` (which would drop Next.js / React
ambient types):

```ts
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />
```

---

## Module augmentation

**Rule:** use `declare module` to fill gaps for packages that lack types, or to
extend an existing module’s public surface. Keep augmentations minimal and
named after the package they patch.

### Stub for an untyped dependency

```ts
// types/swagger-ui-react.d.ts
declare module 'swagger-ui-react';
```

This is enough for `import SwaggerUI from 'swagger-ui-react'` to type-check.
Prefer a stub over `// @ts-ignore` at every call site. If you later need props
or return types, expand **this** file rather than adding ad-hoc casts.

### Augmenting browser globals in tests

Playwright / browser tests that set custom `window` fields should augment
`Window` in the same file (or a shared test ambient) so the property is typed:

```ts
// tests/e2e/security.spec.ts
declare global {
  interface Window {
    __UNAUTHORIZED_SCRIPT_RAN?: boolean;
  }
}
```

### Do / don’t

| Do | Don’t |
| --- | --- |
| One `declare module 'pkg'` per untyped package under `types/` | Cast every import `as any` |
| Augment only the surface you actually use | Copy full DefinitelyTyped definitions you don’t need |
| Keep augmentations in `.d.ts` (or test files that own the symbol) | Put `declare module` inside production `.tsx` components |

`tsconfig.json` already includes `**/*.ts` / `**/*.tsx` and `next-env.d.ts`, so
files under `types/` and `lib/types/` are picked up automatically—no extra
`typeRoots` entry is required for the patterns above.

---

## Never-narrow patterns

**Rule:** use the `never` type to **forbid incompatible combinations** and to
make impossible branches fail at compile time. This is the “never-narrow”
style used for mutually exclusive props and for empty / closed OpenAPI shapes.

### Mutually exclusive props (preferred for UI)

[`components/ui/WidgetEmptyState.tsx`](../components/ui/WidgetEmptyState.tsx)
models three CTA modes as a discriminated union. Conflicting props are typed
as `never` so callers cannot pass both `ctaHref` and `onAction`:

```ts
type WidgetEmptyStateWithLink = WidgetEmptyStateBaseProps & {
  ctaLabel: string;
  ctaHref: string;
  onAction?: never; // link mode forbids an action handler
};

type WidgetEmptyStateWithAction = WidgetEmptyStateBaseProps & {
  ctaLabel: string;
  onAction: () => void;
  ctaHref?: never; // action mode forbids an href
};

type WidgetEmptyStateNoCTA = WidgetEmptyStateBaseProps & {
  ctaLabel?: never;
  ctaHref?: never;
  onAction?: never;
};

type WidgetEmptyStateProps =
  | WidgetEmptyStateWithLink
  | WidgetEmptyStateWithAction
  | WidgetEmptyStateNoCTA;
```

Call-site effect:

```tsx
// OK
<WidgetEmptyState icon={Inbox} title="No bills" description="…" ctaLabel="Pay" ctaHref="/bills" />

// Type error: `onAction` is `never` when `ctaHref` is set
<WidgetEmptyState
  icon={Inbox}
  title="No bills"
  description="…"
  ctaLabel="Pay"
  ctaHref="/bills"
  onAction={() => {}}
/>
```

Prefer this over runtime `if (ctaHref && onAction) throw …` for public
component APIs. Document the variants in
[COMPONENTS.md](./COMPONENTS.md) when you change a shared UI prop surface.

### Empty object / closed maps

Generated OpenAPI types in [`src/api/types.ts`](../src/api/types.ts) use
`Record<string, never>` and bare `never` for sections that are intentionally
empty. Treat those as **closed**—do not widen them to `Record<string, any>`
in feature code; extend the OpenAPI source and regenerate instead
(`npm run generate:types`).

```ts
// Illustrative shape from src/api/types.ts
export type webhooks = Record<string, never>;
```

### Exhaustive switches

When switching on a finite union, assign the remainder to `never` so adding a
new variant becomes a compile error until every branch is handled:

```ts
type RemittanceStatus = 'pending' | 'completed' | 'failed';

function statusLabel(status: RemittanceStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
```

### Avoid accidental `never`

Over-narrowing (for example intersecting contradictory types, or filtering a
union down to nothing) produces `never` and usually means the model is wrong.
If a helper’s return type collapses to `never`, fix the union or guards—do not
paper over it with `as any` or `as unknown as T`.

---

## Checklist for PRs

- [ ] New ambient types live under `types/` or `lib/types/`, with a short
      comment explaining why they exist.
- [ ] Untyped third-party imports use `declare module` once, not per call site.
- [ ] Mutually exclusive component props use `never` on the forbidden fields
      (see `WidgetEmptyState`), not optional props that conflict at runtime.
- [ ] Exhaustive unions use a `never` default (or equivalent) so new variants
      fail type-check until handled.
- [ ] Public prop changes update Storybook (if any) and
      [COMPONENTS.md](./COMPONENTS.md).
- [ ] `npm run lint`, `npm run build`, and unit tests pass locally before push.
