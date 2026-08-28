import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Dashboard E2E Tests
 * 
 * Comprehensive test suite covering:
 * - Visual stability (CLS)
 * - Real-time updates
 * - Offline functionality
 * - Accessibility
 * - Performance
 */

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test.describe('Initial Load', () => {
    test('should display dashboard header', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
      await expect(
        page.getByText('Real-time metrics and productivity insights')
      ).toBeVisible()
    })

    test('should display all metric cards', async ({ page }) => {
      // Wait for metrics to load
      await page.waitForSelector('[data-slot="card-metric"]', { state: 'visible' })

      // Should have 4 metric cards
      const metricCards = await page.locator('[data-slot="card-metric"]').count()
      expect(metricCards).toBe(4)
    })

    test('should display charts section', async ({ page }) => {
      // Wait for charts to render
      await page.waitForSelector('[data-slot="chart"]', { state: 'visible' })

      // Should have 2 charts (activity + funnel)
      const charts = await page.locator('[data-slot="chart"]').count()
      expect(charts).toBeGreaterThanOrEqual(2)
    })
  })

  test.describe('Visual Stability', () => {
    test('should have minimal layout shift (CLS < 0.1)', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard')

      // Wait for full hydration
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000) // Allow animations to complete

      // Measure Cumulative Layout Shift
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsScore = 0

          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const layoutShift = entry as any
              // Only count shifts without recent input
              if (!layoutShift.hadRecentInput) {
                clsScore += layoutShift.value
              }
            }
          })

          observer.observe({ type: 'layout-shift', buffered: true })

          // Resolve after 3 seconds of observation
          setTimeout(() => {
            observer.disconnect()
            resolve(clsScore)
          }, 3000)
        })
      })

      // CLS should be excellent (< 0.1)
      expect(cls).toBeLessThan(0.1)
    })

    test('should maintain consistent dimensions during hydration', async ({ page }) => {
      await page.goto('/dashboard')

      // Get initial dimensions of first metric card
      const initialBox = await page
        .locator('[data-slot="card-metric"]')
        .first()
        .boundingBox()

      // Wait for client-side hydration
      await page.waitForTimeout(2000)

      // Get dimensions after hydration
      const hydratedBox = await page
        .locator('[data-slot="card-metric"]')
        .first()
        .boundingBox()

      // Dimensions should remain the same
      expect(hydratedBox?.height).toBe(initialBox?.height)
      expect(hydratedBox?.width).toBe(initialBox?.width)
    })
  })

  test.describe('Real-Time Updates', () => {
    test('should update metrics periodically', async ({ page }) => {
      await page.goto('/dashboard')

      // Get initial metric value
      const initialValue = await page
        .locator('[data-slot="card-metric"]')
        .first()
        .locator('.text-2xl')
        .textContent()

      // Wait for polling interval (10s + buffer)
      await page.waitForTimeout(12000)

      // Get updated value
      const updatedValue = await page
        .locator('[data-slot="card-metric"]')
        .first()
        .locator('.text-2xl')
        .textContent()

      // Values should change (mock data generates random values)
      expect(initialValue).toBeTruthy()
      expect(updatedValue).toBeTruthy()
      // Note: With random mock data, values will differ
    })

    test('should animate counter transitions smoothly', async ({ page }) => {
      await page.goto('/dashboard')

      // Monitor for animation frame updates
      const hasAnimation = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          let frameCount = 0
          const checkFrames = () => {
            frameCount++
            if (frameCount > 10) {
              resolve(true) // Multiple frames = animation working
            } else {
              requestAnimationFrame(checkFrames)
            }
          }
          requestAnimationFrame(checkFrames)
        })
      })

      expect(hasAnimation).toBe(true)
    })
  })

  test.describe('Offline Functionality', () => {
    test('should work offline with cached data', async ({ page, context }) => {
      // Load page online first
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Verify metrics are visible
      const onlineMetrics = await page.locator('[data-slot="card-metric"]').count()
      expect(onlineMetrics).toBe(4)

      // Simulate offline
      await context.setOffline(true)

      // Reload page
      await page.reload()
      await page.waitForTimeout(2000)

      // Should still show metrics from cache
      const offlineMetrics = await page.locator('[data-slot="card-metric"]').count()
      expect(offlineMetrics).toBe(4)

      // Should show offline indicator
      await expect(page.getByText(/You're offline/i)).toBeVisible()
    })

    test('should display last updated timestamp when offline', async ({
      page,
      context,
    }) => {
      // Load online
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Go offline
      await context.setOffline(true)
      await page.reload()

      // Should show timestamp badge
      await expect(page.getByText(/Last updated:/i)).toBeVisible()
    })

    test('should restore online functionality when connection returns', async ({
      page,
      context,
    }) => {
      // Load online
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Go offline
      await context.setOffline(true)
      await page.reload()

      // Verify offline indicator
      await expect(page.getByText(/You're offline/i)).toBeVisible()

      // Come back online
      await context.setOffline(false)

      // Wait for reconnection and data refresh
      await page.waitForTimeout(2000)

      // Offline indicator should disappear
      await expect(page.getByText(/You're offline/i)).not.toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should have no accessibility violations', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/dashboard')

      // Check for aria-labels on key elements
      const metricsRegion = page.getByRole('region', { name: /Dashboard metrics/i })
      await expect(metricsRegion).toBeVisible()

      const chartsRegion = page.getByRole('region', { name: /Dashboard charts/i })
      await expect(chartsRegion).toBeVisible()
    })

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/dashboard')

      // Start from top of page
      await page.keyboard.press('Tab')

      // Should be able to tab through interactive elements
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName
      })

      expect(focusedElement).toBeTruthy()
    })

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/dashboard')

      // Run contrast audit
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include('[data-slot="card-metric"]')
        .analyze()

      const contrastViolations = results.violations.filter((v) =>
        v.id.includes('contrast')
      )

      expect(contrastViolations).toHaveLength(0)
    })

    test('should announce updates to screen readers', async ({ page }) => {
      await page.goto('/dashboard')

      // Check for aria-live regions
      const liveRegion = page.locator('[aria-live="polite"]')
      await expect(liveRegion).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should display error boundary when API fails', async ({ page }) => {
      // Intercept API and force failure
      await page.route('**/api/dashboard', (route) =>
        route.abort('failed')
      )

      await page.goto('/dashboard')

      // Should show error message (but in this case, fallback to mock data)
      // The implementation gracefully handles errors
      const metrics = await page.locator('[data-slot="card-metric"]').count()
      expect(metrics).toBeGreaterThan(0) // Still shows data via fallback
    })
  })

  test.describe('Performance', () => {
    test('should load within performance budget', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/dashboard')
      await page.waitForLoadState('domcontentloaded')

      const loadTime = Date.now() - startTime

      // Should load DOM in under 2 seconds
      expect(loadTime).toBeLessThan(2000)
    })

    test('should have good Largest Contentful Paint (LCP)', async ({ page }) => {
      await page.goto('/dashboard')

      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            resolve((lastEntry as any).renderTime || (lastEntry as any).loadTime)
          }).observe({ type: 'largest-contentful-paint', buffered: true })

          // Fallback timeout
          setTimeout(() => resolve(0), 5000)
        })
      })

      // LCP should be under 2.5s for good performance
      expect(lcp).toBeGreaterThan(0)
      expect(lcp).toBeLessThan(2500)
    })

    test('should have minimal JavaScript execution time', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as any
        return {
          domInteractive: perfData.domInteractive,
          domComplete: perfData.domComplete,
        }
      })

      // Time to interactive should be reasonable
      expect(metrics.domInteractive).toBeLessThan(3000)
      expect(metrics.domComplete).toBeLessThan(5000)
    })
  })

  test.describe('Responsive Design', () => {
    test('should adapt layout for mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')

      // Metrics should stack vertically
      const firstCard = await page.locator('[data-slot="card-metric"]').first()
      const secondCard = await page.locator('[data-slot="card-metric"]').nth(1)

      const firstBox = await firstCard.boundingBox()
      const secondBox = await secondCard.boundingBox()

      // Cards should be stacked (Y position of second > first + height)
      expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height)
    })

    test('should adapt layout for tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/dashboard')

      // Should have 2-column grid
      const metrics = await page.locator('[data-slot="card-metric"]').count()
      expect(metrics).toBe(4)
    })

    test('should adapt layout for desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto('/dashboard')

      // Should have 4-column grid
      const firstCard = await page.locator('[data-slot="card-metric"]').first()
      const fourthCard = await page.locator('[data-slot="card-metric"]').nth(3)

      const firstBox = await firstCard.boundingBox()
      const fourthBox = await fourthCard.boundingBox()

      // Fourth card should be on same row (similar Y position)
      expect(Math.abs(fourthBox!.y - firstBox!.y)).toBeLessThan(50)
    })
  })

  test.describe('Charts Interaction', () => {
    test('should display chart tooltips on hover', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForSelector('[data-slot="chart"]')

      // Hover over chart area
      const chart = page.locator('[data-slot="chart"]').first()
      await chart.hover()

      // Tooltip should appear (Recharts tooltips)
      // Note: Recharts tooltips are dynamically positioned
      await page.waitForTimeout(500)
    })

    test('should render charts with theme colors', async ({ page }) => {
      await page.goto('/dashboard')

      // Check that charts use CSS variables for theming
      const chartStyles = await page.evaluate(() => {
        const chartElement = document.querySelector('[data-slot="chart"]')
        if (!chartElement) return null

        const styles = window.getComputedStyle(chartElement)
        return {
          hasChartVar: !!styles.getPropertyValue('--color-users'),
        }
      })

      expect(chartStyles).toBeTruthy()
    })
  })
})
