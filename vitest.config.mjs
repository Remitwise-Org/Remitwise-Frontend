import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    pool: 'vmForks',
    include: [
      'lib/contracts/**/*.test.ts',
      'lib/**/*.test.ts',
      'lib/**/*.test.tsx',
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/unit/**/*.test.cjs',
      'tests/integration/**/*.test.ts',
      'tests/property/**/*.test.ts',
      'tests/property/**/*.test.cjs',
      'tests/session/**/*.test.ts',
      'tests/session/**/*.test.cjs',
      'components/**/*.test.tsx',
    ],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/contracts/**/*.ts',
        'app/**/*.ts',
        'app/**/*.tsx',
        'lib/**/*.ts',
        'components/**/*.tsx',
      ],
      exclude: [
        'lib/contracts/**/*.test.ts',
        'lib/**/*.test.ts',
        'lib/**/*.test.tsx',
        'tests/**',
        'components/**/*.test.tsx',
      ],
    },
    alias: {
      '@': rootDir,
    },
  },
});
