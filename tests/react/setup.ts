import { beforeAll } from 'vitest'

beforeAll(() => {
  // Ensure predictable layout for chart mounts.
  // Recharts may rely on ResizeObserver; jsdom doesn't provide it.
  if (!(global as any).ResizeObserver) {
    ;(global as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})


