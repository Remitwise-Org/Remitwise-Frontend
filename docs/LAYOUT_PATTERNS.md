# Layout Patterns

This document is for **contributors** working on frontend pages and components.
It captures the layout conventions already used across the app so new pages
stay visually and structurally consistent, instead of each page inventing its
own spacing, grid, and wrapper structure.

## Page Shell (`LayoutWrapper`)

Every route is wrapped by `components/LayoutWrapper.tsx`, which renders the
shared header, footer, and error boundary around page content:

```tsx
// components/LayoutWrapper.tsx
export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
    const excludedRoutes = ["/transactions", "/financial-insights"];

      const isExcluded =
          excludedRoutes.includes(pathname) || pathname.startsWith("/dashboard");

            if (isExcluded) {
                return <RootErrorBoundary>{children}</RootErrorBoundary>;
                  }

                    return (
                        <RootErrorBoundary>
                              <Header />
                                    <div className="overflow-x-hidden pt-16 375:pt-20">
                                            {children}
                                                    <FinalCallToAction />
                                                            <Footer />
                                                                  </div>
                                                                      </RootErrorBoundary>
                                                                        );
                                                                        }