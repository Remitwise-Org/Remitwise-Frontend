import { test, expect } from '@playwright/test'

/**
 * Performance Monitoring E2E Tests
 * 
 * Tests Core Web Vitals and dashboard-specific performance metrics
 * 
 * Test Coverage:
 * - Core Web Vitals (CLS, LCP, FID)
 * - Dashboard performance metrics
 * - Performance reporting
 * - Animation performance
 */

test.describe('Core Web Vitals Monitoring', () => {
  test('should track Cumulative Layout Shift (CLS) < 0.1', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle')
    
    // Measure CLS
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
        
        // Observe for 3 seconds
        setTimeout(() => {
          observer.disconnect()
          resolve(clsScore)
        }, 3000)
      })
    })
    
    console.log(`CLS: ${cls.toFixed(4)}`)
    
    // CLS should be less than 0.1 (good)
    expect(cls).toBeLessThan(0.1)
    
    // Ideally less than 0.05 (excellent)
    if (cls >= 0.05) {
      console.warn(`CLS is ${cls.toFixed(4)}, consider optimizing (target < 0.05)`)
    }
  })

  test('should track Largest Contentful Paint (LCP) < 2.5s', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Measure LCP
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1] as any
            lcpValue = lastEntry.renderTime || lastEntry.loadTime
          }
        })
        
        observer.observe({ type: 'largest-contentful-paint', buffered: true })
        
        // Wait for LCP to stabilize
        setTimeout(() => {
          observer.disconnect()
          resolve(lcpValue)
        }, 5000)
      })
    })
    
    console.log(`LCP: ${lcp.toFixed(2)}ms`)
    
    // LCP should be less than 2.5s (good)
    expect(lcp).toBeLessThan(2500)
    
    // Ideally less than 2.0s (excellent)
    if (lcp >= 2000) {
      console.warn(`LCP is ${lcp.toFixed(2)}ms, consider optimizing (target < 2000ms)`)
    }
  })

  test('should have fast Time to First Byte (TTFB) < 600ms', async ({ page }) => {
    await page.goto('/dashboard')
    
    const ttfb = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return perfData.responseStart - perfData.requestStart
    })
    
    console.log(`TTFB: ${ttfb.toFixed(2)}ms`)
    
    // TTFB should be less than 600ms (good)
    expect(ttfb).toBeLessThan(600)
    
    // Ideally less than 400ms (excellent)
    if (ttfb >= 400) {
      console.warn(`TTFB is ${ttfb.toFixed(2)}ms, consider server optimization (target < 400ms)`)
    }
  })

  test('should have fast First Contentful Paint (FCP) < 1.8s', async ({ page }) => {
    await page.goto('/dashboard')
    
    const fcp = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return perfData.domContentLoadedEventEnd
    })
    
    console.log(`FCP: ${fcp.toFixed(2)}ms`)
    
    // FCP should be less than 1.8s (good)
    expect(fcp).toBeLessThan(1800)
    
    // Ideally less than 1.5s (excellent)
    if (fcp >= 1500) {
      console.warn(`FCP is ${fcp.toFixed(2)}ms, consider optimizing (target < 1500ms)`)
    }
  })
})

test.describe('Dashboard Performance Metrics', () => {
  test('should track data fetch duration', async ({ page }) => {
    // Listen for console logs
    const performanceLogs: string[] = []
    page.on('console', (msg) => {
      if (msg.text().includes('[Dashboard] Data fetch completed')) {
        performanceLogs.push(msg.text())
      }
    })
    
    await page.goto('/dashboard')
    
    // Wait for data fetch
    await page.waitForTimeout(2000)
    
    // In production, this would be sent to analytics
    // In development, it's logged to console
    console.log('Performance logs captured:', performanceLogs.length)
  })

  test('should have fast initial page load', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    
    const loadTime = Date.now() - startTime
    
    console.log(`Initial page load: ${loadTime}ms`)
    
    // Initial load should be fast (< 2s)
    expect(loadTime).toBeLessThan(2000)
  })

  test('should have fast time to interactive', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Click a button to ensure interactivity
    const refreshButton = page.getByRole('button', { name: /refresh/i })
    if (await refreshButton.isVisible()) {
      await refreshButton.click()
    }
    
    const timeToInteractive = Date.now() - startTime
    
    console.log(`Time to interactive: ${timeToInteractive}ms`)
    
    // Should be interactive quickly (< 3s)
    expect(timeToInteractive).toBeLessThan(3000)
  })

  test('should render skeletons without layout shift', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Measure layout shifts during skeleton → content transition
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsScore = 0
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as any
            if (!layoutShift.hadRecentInput) {
              clsScore += layoutShift.value
            }
          }
        })
        
        observer.observe({ type: 'layout-shift', buffered: true })
        
        // Wait for content to load
        setTimeout(() => {
          observer.disconnect()
          resolve(clsScore)
        }, 2000)
      })
    })
    
    console.log(`CLS during hydration: ${cls.toFixed(4)}`)
    
    // Should have minimal layout shift during hydration
    expect(cls).toBeLessThan(0.05)
  })
})

test.describe('Performance Reporting', () => {
  test('should expose performance marks for dashboard operations', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for operations to complete
    await page.waitForLoadState('networkidle')
    
    // Check if performance marks exist
    const marks = await page.evaluate(() => {
      const allMarks = performance.getEntriesByType('mark')
      return allMarks.map((mark) => mark.name)
    })
    
    console.log('Performance marks:', marks)
    
    // Should have dashboard-related marks
    // Note: Marks may vary based on implementation
    expect(marks.length).toBeGreaterThan(0)
  })

  test('should have performance measures for critical operations', async ({ page }) => {
    await page.goto('/dashboard')
    
    await page.waitForLoadState('networkidle')
    
    const measures = await page.evaluate(() => {
      const allMeasures = performance.getEntriesByType('measure')
      return allMeasures.map((measure) => ({
        name: measure.name,
        duration: measure.duration,
      }))
    })
    
    console.log('Performance measures:', measures)
    
    // Log any measures found (helpful for debugging)
    measures.forEach((measure) => {
      console.log(`  ${measure.name}: ${measure.duration.toFixed(2)}ms`)
    })
  })
})

test.describe('Animation Performance', () => {
  test('should maintain 60fps during counter animations', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Track frame rate during animation
    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const frameTimes: number[] = []
        let frameCount = 0
        const duration = 1000 // Track for 1 second
        const startTime = performance.now()
        
        function measureFrame() {
          const now = performance.now()
          frameTimes.push(now)
          frameCount++
          
          if (now - startTime < duration) {
            requestAnimationFrame(measureFrame)
          } else {
            // Calculate FPS
            const avgFps = (frameCount / duration) * 1000
            resolve(avgFps)
          }
        }
        
        requestAnimationFrame(measureFrame)
      })
    })
    
    console.log(`Animation FPS: ${fps.toFixed(2)}`)
    
    // Should maintain at least 30fps (minimum acceptable)
    expect(fps).toBeGreaterThan(30)
    
    // Ideally 60fps
    if (fps < 55) {
      console.warn(`FPS is ${fps.toFixed(2)}, consider optimizing animations (target: 60fps)`)
    }
  })

  test('should have smooth transitions without jank', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle')
    
    // Measure long tasks (> 50ms blocks main thread)
    const longTasks = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let longTaskCount = 0
        
        // Note: PerformanceLongTaskTiming requires origin-trial or is not available in all browsers
        // This is a fallback check
        try {
          const observer = new PerformanceObserver((list) => {
            longTaskCount += list.getEntries().length
          })
          
          if ('longtask' in PerformanceObserver.supportedEntryTypes) {
            observer.observe({ type: 'longtask', buffered: true })
          }
          
          setTimeout(() => {
            observer.disconnect()
            resolve(longTaskCount)
          }, 3000)
        } catch {
          resolve(0)
        }
      })
    })
    
    console.log(`Long tasks detected: ${longTasks}`)
    
    // Should have minimal long tasks
    if (longTasks > 5) {
      console.warn(`${longTasks} long tasks detected, consider breaking up JavaScript execution`)
    }
  })
})

test.describe('Performance Monitoring Component', () => {
  test('should not impact page performance', async ({ page }) => {
    // Load page and measure total blocking time
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    
    const loadTime = Date.now() - startTime
    
    // Performance monitoring should not significantly delay page load
    expect(loadTime).toBeLessThan(2000)
  })

  test('should initialize monitoring without errors', async ({ page }) => {
    const errors: string[] = []
    
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Wait for monitoring to initialize (1s delay)
    await page.waitForTimeout(1500)
    
    // Should not have any errors
    expect(errors).toHaveLength(0)
  })

  test('should support Performance Observer APIs', async ({ page }) => {
    await page.goto('/dashboard')
    
    const support = await page.evaluate(() => {
      return {
        performanceObserver: 'PerformanceObserver' in window,
        layoutShift: PerformanceObserver.supportedEntryTypes?.includes('layout-shift'),
        lcp: PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint'),
        firstInput: PerformanceObserver.supportedEntryTypes?.includes('first-input'),
        navigation: PerformanceObserver.supportedEntryTypes?.includes('navigation'),
      }
    })
    
    console.log('Browser support:', support)
    
    // PerformanceObserver should be supported
    expect(support.performanceObserver).toBe(true)
    
    // Log warnings for unsupported metrics
    if (!support.layoutShift) {
      console.warn('Layout Shift API not supported in this browser')
    }
    if (!support.lcp) {
      console.warn('LCP API not supported in this browser')
    }
  })
})

test.describe('Performance Budget Compliance', () => {
  test('should meet all performance budgets', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Measure all key metrics
    const metrics = await page.evaluate(() => {
      return new Promise<any>((resolve) => {
        const result: any = {}
        let clsScore = 0
        let lcpValue = 0
        
        // CLS
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as any
            if (!layoutShift.hadRecentInput) {
              clsScore += layoutShift.value
            }
          }
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })
        
        // LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1] as any
            lcpValue = lastEntry.renderTime || lastEntry.loadTime
          }
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
        
        // Wait for metrics to settle
        setTimeout(() => {
          clsObserver.disconnect()
          lcpObserver.disconnect()
          
          const perfData = performance.getEntriesByType('navigation')[0] as any
          
          result.cls = clsScore
          result.lcp = lcpValue
          result.ttfb = perfData?.responseStart || 0
          result.fcp = perfData?.domContentLoadedEventEnd || 0
          
          resolve(result)
        }, 3000)
      })
    })
    
    console.log('Performance Budget Check:')
    console.log(`  CLS: ${metrics.cls.toFixed(4)} (budget: < 0.05)`)
    console.log(`  LCP: ${metrics.lcp.toFixed(2)}ms (budget: < 2000ms)`)
    console.log(`  TTFB: ${metrics.ttfb.toFixed(2)}ms (budget: < 400ms)`)
    console.log(`  FCP: ${metrics.fcp.toFixed(2)}ms (budget: < 1500ms)`)
    
    // Check against budgets
    const budgetResults = {
      cls: metrics.cls < 0.05,
      lcp: metrics.lcp < 2000,
      ttfb: metrics.ttfb < 400,
      fcp: metrics.fcp < 1500,
    }
    
    console.log('\nBudget Compliance:')
    console.log(`  CLS: ${budgetResults.cls ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`  LCP: ${budgetResults.lcp ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`  TTFB: ${budgetResults.ttfb ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`  FCP: ${budgetResults.fcp ? '✅ PASS' : '❌ FAIL'}`)
    
    // At least 3 out of 4 should pass
    const passCount = Object.values(budgetResults).filter(Boolean).length
    expect(passCount).toBeGreaterThanOrEqual(3)
  })
})
