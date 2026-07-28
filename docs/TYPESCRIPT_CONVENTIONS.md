# TypeScript Conventions

Audience: **Frontend Contributors**

This guide captures how RemitWise uses ambient types, module augmentation, and
`never`-narrow patterns. These conventions live in the codebase already; this
document makes them reviewable and onboarding-friendly so contributors do not
have to reconstruct them from commit history.

Related reading:

- [PROP_CONVENTIONS.md](PROP_CONVENTIONS.md) — component prop naming and ordering
- [FRONTEND_CONTRIBUTING.md](FRONTEND_CONTRIBUTING.md) — local setup and preferred patterns
- [architecture.md](architecture.md) — route and layer map

---

## 1. Ambient types

Ambient declarations tell TypeScript about values that exist at runtime but are
not imported as modules. Prefer a dedicated `.d.ts` (or a triple-slash reference)
over sprinkling `any` at call sites.

### 1.1 Test-runner globals (`vitest-env.d.ts`)

Vitest is configured with `globals: true`, so `describe`, `it`, `expect`, and
`vi` are available without imports. Ambient references make those globals
visible to `tsc` **without** forcing `compilerOptions.types` project-wide
(which would drop Next.js / React ambient types):

```typescript
// vitest-env.d.ts
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />
```

**Rules**

- Keep Vitest / jest-dom ambient references in `vitest-env.d.ts`, not in app
  source files.
- Do not add `"types": ["vitest/globals"]` to root `tsconfig.json` unless you
  also preserve Next.js ambient types another way.

### 1.2 Shared process globals (`lib/types/global.d.ts`)

Hot-reload–safe Prisma reuse is typed via an ambient global, then closed with
an empty export so the file is treated as a module:

```typescript
// lib/types/global.d.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export {};
```

The matching runtime assignment lives in `lib/db.ts`:

```typescript
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient(/* ... */);

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
```

**Rules**

- Ambient globals that are also assigned in `.ts` files must stay in sync
  (same name, same type).
- Always end a `declare global` file with `export {}` when the file has no
  other exports — otherwise TypeScript treats it as a script and pollutes the
  global scope unexpectedly.
- Prefer `var` for Node process globals that attach to `global` / `globalThis`
  (required for correct augmentation of the global object).

### 1.3 When to add a new ambient file

| Situation | Prefer |
| --- | --- |
| Third-party package ships no types | `types/<package>.d.ts` with `declare module` |
| Test-only globals | `vitest-env.d.ts` or a test helper ambient |
| App-wide Node / browser globals | `lib/types/global.d.ts` (or a scoped `*.d.ts` next to the feature) |
| One-off Playwright / e2e Window field | Local `declare global` in that spec (see §2.3) |

---

## 2. Module augmentation

Module augmentation extends an existing module or global interface without
forking the package. Use it when you need a typed seam for an untyped
dependency, or when you attach a field TypeScript does not know about yet.

### 2.1 Untyped npm packages

`swagger-ui-react` is consumed without a full type package. A minimal ambient
module keeps imports compiling:

```typescript
// types/swagger-ui-react.d.ts
declare module "swagger-ui-react";
```

**Rules**

- Start with the minimal declaration that unblocks compilation.
- If you later need props / return types, expand the same file with an explicit
  module shape instead of casting at every call site:

```typescript
declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  export interface SwaggerUIProps {
    url?: string;
    spec?: Record<string, unknown>;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
```

### 2.2 Augmenting `global` / `Window`

For feature-local browser fields (especially in e2e), augment `Window` next to
the test that uses it:

```typescript
// tests/e2e/security.spec.ts
declare global {
  interface Window {
    __UNAUTHORIZED_SCRIPT_RAN?: boolean;
  }
}
```

**Rules**

- Prefix synthetic Window fields with `__` so they are obviously test / probe
  markers, not product API.
- Prefer optional properties (`?:`) so pages that never set the field still
  type-check.
- Do not put e2e-only Window fields into `lib/types/global.d.ts`.

### 2.3 Augmenting library interfaces

When Storybook, Next.js, or a UI library needs extra fields, augment the
library interface rather than casting:

```typescript
// Prefer module augmentation
declare module "some-library" {
  interface ExistingOptions {
    remitwiseTraceId?: string;
  }
}

// Avoid scattering
const options = { remitwiseTraceId: "…" } as any;
```

---

## 3. `never`-narrow patterns

`never` means “this value cannot exist.” Use it to prove exhaustiveness, to
type functions that do not return, and to model intentionally empty objects.

### 3.1 Exhaustive switch / discriminant narrowing

When handling a union, put an `assertNever` (or equivalent) in the `default`
branch so adding a new variant becomes a compile error:

```typescript
type RemittanceStatus = "quoted" | "submitted" | "failed";

function assertNever(value: never): never {
  throw new Error(`Unhandled remittance status: ${String(value)}`);
}

function statusLabel(status: RemittanceStatus): string {
  switch (status) {
    case "quoted":
      return "Quote ready";
    case "submitted":
      return "Submitted to network";
    case "failed":
      return "Failed";
    default:
      return assertNever(status);
  }
}
```

**Rules**

- Prefer `assertNever(x)` over `x as never` in production control flow — the
  helper both type-checks exhaustiveness and fails loudly at runtime.
- Do not use `default: break` on discriminant unions; that silently drops new
  cases.

### 3.2 Functions that never return

Mocks and abort helpers often call APIs typed as `never` (for example
`process.exit`). Return `undefined as never` only at those typed seams:

```typescript
// tests/unit/background-runtime.test.ts
processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
  return undefined as never;
});
```

Timeout / abort races use `Promise<never>` because the reject branch never
resolves a value:

```typescript
// lib/soroban/client.ts (pattern)
new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error("Soroban RPC timeout")), timeoutMs);
});
```

**Rules**

- `as never` is allowed at intentional non-return seams (mocks of `exit`,
  unreachable helper returns). It is **not** a substitute for fixing a real
  type error in feature code.
- Prefer `Promise<never>` for reject-only helpers instead of `Promise<any>`.

### 3.3 Empty object / empty map types

OpenAPI-generated and domain types use `Record<string, never>` for objects that
must stay empty (no accidental keys):

```typescript
// src/api/types.ts (generated pattern)
export type webhooks = Record<string, never>;
export type operations = Record<string, never>;
```

Component tests that need “no props” use the same shape:

```typescript
constructor(props: Record<string, never>) {
  super(props);
}
```

**Rules**

- Use `Record<string, never>` (or `{ [key: string]: never }`) when the object
  must reject extra properties.
- Do not use `{}` for “empty object” — in TypeScript `{}` means “any
  non-nullish value,” which is almost never the intent.

### 3.4 Quick decision table

| Intent | Pattern |
| --- | --- |
| Prove a switch handled every union member | `assertNever(value)` in `default` |
| Mock a runtime API typed as `never` | `return undefined as never` |
| Promise that only rejects | `new Promise<never>((_, reject) => …)` |
| Object that must have no keys | `Record<string, never>` |
| Silence a type error in app code | **Do not** use `never` — fix the types |

---

## 4. Review checklist

Before merging TypeScript changes that touch these patterns:

- [ ] New ambient files live under `types/`, `lib/types/`, or a documented
      test ambient entrypoint — not inline in unrelated components.
- [ ] `declare global` modules end with `export {}` when required.
- [ ] Untyped packages get a `declare module` shim instead of per-call `any`.
- [ ] Discriminant unions use exhaustive `never` handling.
- [ ] `as never` appears only at documented non-return seams.
- [ ] `npm run typecheck` (or `npm run build`) still passes.

---

## 5. Verifying examples locally

These commands confirm ambient resolution and type narrowing still work after
doc-driven changes:

```bash
# Ambient + module resolution across the app
npm run typecheck

# Lint (includes project ESLint rules that catch common any / unused patterns)
npm run lint

# Unit tests that exercise never-return mocks (e.g. process.exit)
npm run test:unit
```

If you add a new ambient `.d.ts`, re-run `npm run typecheck` before opening the
PR so reviewers can trust the documented intent matches the compiler.
