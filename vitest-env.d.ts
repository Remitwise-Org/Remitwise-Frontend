// Ambient types for the Vitest test runner.
//
// `vitest.config.mts` enables `globals: true`, so `describe`, `it`, `expect`,
// `vi`, `beforeEach`, etc. are available globally at runtime. This reference
// makes those globals visible to `tsc` as well, without constraining the
// project-wide `compilerOptions.types` (which would otherwise drop Next.js and
// React ambient types).
//
// The jest-dom reference augments Vitest's `expect` with DOM matchers such as
// `toBeInTheDocument()` (registered at runtime by `vitest.setup.ts`).
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />
