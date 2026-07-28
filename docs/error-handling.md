# Error Handling

The app shell is protected by `RootErrorBoundary` in `components/LayoutWrapper.tsx` and Next.js's native `app/error.tsx`.
They catch unexpected client render failures outside dashboard widget boundaries,
report them to Sentry, and show an isolated fallback with a key-based retry so
the protected subtree is remounted from a clean React tree.

The `RootErrorFallback` component provides a **per-route fallback UI**, adapting the
error messaging based on the current path (e.g. Dashboard, Transfer, Settings) using
constants defined in `lib/config/route-errors.ts`.

Dashboard widgets still use `WidgetErrorBoundary` so a single widget failure can
degrade locally without replacing the whole shell.

For more details on implementing standard default, hover, focus, error, disabled, and loading states across components, see the [Frontend Component States Guide](COMPONENT_STATES.md).

