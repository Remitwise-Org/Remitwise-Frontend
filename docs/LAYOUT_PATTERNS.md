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

## Sticky Headers and CTAs

To maintain scroll landmark visibility and keep the primary Call to Action (CTA) in view during long scrolling lists on tall viewports (height >= 800px), headers containing primary page CTAs are styled to remain sticky:
- Standard pages use the reusable `PageHeader` which stays sticky via `tall:sticky`.
- The top-offset must correspond to the height of the fixed navigation header (`tall:top-16 375:tall:top-20`) to clear the logo/menu area.
- Solid background fills matching the page color (e.g. `bg-[#010101]`, `bg-[#0a0b0f]`) and subtle borders should be applied to prevent content bleed during scrolling.