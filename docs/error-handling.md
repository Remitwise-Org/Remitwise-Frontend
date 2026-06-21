# Error Handling

The app shell is protected by `RootErrorBoundary` in `components/LayoutWrapper.tsx`.
It catches unexpected client render failures outside dashboard widget boundaries,
reports them to Sentry, and shows an isolated fallback with a key-based retry so
the protected subtree is remounted from a clean React tree.

Dashboard widgets still use `WidgetErrorBoundary` so a single widget failure can
degrade locally without replacing the whole shell.
