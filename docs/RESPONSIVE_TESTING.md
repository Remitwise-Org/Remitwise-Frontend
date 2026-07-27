# How to Verify Responsive Breakpoints

This guide explains how frontend contributors can test and verify that application UI components and pages behave correctly across the supported responsive viewport range (320px to 1440px+).

---

## Target Audience & Goals
This document is written for **frontend contributors** who are building new pages/components or refactoring existing layouts. The goal is to ensure that all interface changes meet our responsive quality guidelines and do not introduce layout defects or regressions.

---

## Responsive Breakpoint Standards
Before verifying, make sure your components utilize our custom Tailwind breakpoints and spacing scale (defined in [lib/config/layout.json](../lib/config/layout.json), consumed by [tailwind.config.js](../tailwind.config.js)).

### Supported Viewports

| Name | Width | Key Device Reference | Testing Priority |
| :--- | :--- | :--- | :--- |
| **320px** | 320px | iPhone SE | 🔴 Critical (Smallest mobile layout, most overflow bugs happen here) |
| **375px** | 375px | iPhone 14 / 15 | 🔴 Critical (Primary target for standard mobile layout) |
| **450px** | 450px | Foldables / Large mobile | 🟡 High (Intermediate width, tests grid-collapsing transitions) |
| **768px** | 768px | iPad Portrait | 🟡 High (First tablet breakpoint, column layout transition) |
| **1024px**| 1024px| iPad Landscape | 🟢 Medium (Desktop transition breakpoint) |
| **1440px**| 1440px| Standard Desktop | 🟢 Medium (Default desktop width, verifies max content width limits) |

---

## Core Acceptance Criteria for Layouts

When verifying a feature, your changes must pass the following key checks:

1. **No Horizontal Overflow (Scroll)**
   The total width of the document (`documentElement.scrollWidth`) must never exceed the viewport client width (`documentElement.clientWidth`). The layout must scale dynamically without causing horizontal scrolling.
2. **Touch Targets (WCAG 2.1 Level AAA)**
   All interactive components (buttons, links, form inputs) must have a touch target of at least **44x44px** on mobile.
   - Use CSS class `.touch-target` to guarantee a minimum height/width of 44px.
   - Use CSS class `.touch-target-wide` to guarantee a minimum height of 44px and width of 88px.
3. **Minimum Mobile Typography**
   To prevent iOS Safari from automatically zooming into input text fields, body and input text on mobile devices (width < 768px) must have a font size of at least **14px** (preferred: 16px).
4. **iOS Notch and Safe Areas**
   Respect physical notches/Dynamic Islands and dynamic taskbars by applying environment-safe padding:
   - `.safari-safe-top`
   - `.safari-safe-bottom`
   - `.safari-safe-left`
   - `.safari-safe-right`

---

## Method A: Automated Verification (Playwright)

We use Playwright to run layout audits at scale. This is the preferred method for automated regression testing.

### Running Existing Responsive Tests
To run the automated responsive test suite locally:
```bash
npm run test:e2e -- tests/e2e/responsive-split-savings.spec.ts
```

### Writing a Responsive Test Case
When introducing a new feature, you should write a matching E2E spec. Create a file under `tests/e2e/` (e.g., `tests/e2e/responsive-my-feature.spec.ts`) using the following structure:

```typescript
import { test, expect, type Page } from '@playwright/test';

// Define the viewports we support
const viewports = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'iPhone 14', width: 375, height: 667 },
  { name: 'Foldable', width: 450, height: 800 },
  { name: 'iPad Portrait', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
];

// Helper to check for horizontal page overflow
async function checkNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow).toBe(false);
}

// Helper to check element-level horizontal overflow relative to client viewport
async function checkNoElementOverflow(page: Page, rootSelector = 'main') {
  const offenders = await page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return [];
    const viewportWidth = document.documentElement.clientWidth;
    return Array.from(root.querySelectorAll<HTMLElement>('*'))
      .filter((el) => {
        const style = window.getComputedStyle(el);
        if (
          style.position === 'fixed' ||
          style.display === 'none' ||
          style.visibility === 'hidden'
        ) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.right - viewportWidth > 1 || rect.left < -1;
      })
      .slice(0, 5)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        className: el.className,
      }));
  }, rootSelector);

  expect(offenders).toEqual([]);
}

// Helper to check touch target boundaries
async function checkTouchTargetSize(page: Page, selector: string, minWidth = 44, minHeight = 44) {
  const element = page.locator(selector).first();
  const box = await element.boundingBox();
  if (box) {
    expect(box.width).toBeGreaterThanOrEqual(minWidth);
    expect(box.height).toBeGreaterThanOrEqual(minHeight);
  }
}

test.describe('My Feature - Responsive Verification', () => {
  viewports.forEach(({ name, width, height }) => {
    
    test(`${name} (${width}x${height}) - Layout and Overflow`, async ({ page }) => {
      // Set the viewport size dynamically
      await page.setViewportSize({ width, height });
      
      // Navigate to the target page
      await page.goto('/split');
      
      // Wait until DOM content is loaded
      await page.waitForLoadState('domcontentloaded');
      
      // Assert that there is no horizontal page overflow
      await checkNoHorizontalOverflow(page);
      await checkNoElementOverflow(page, 'main');
    });

    test(`${name} (${width}x${height}) - WCAG Touch Targets`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/split');
      await page.waitForLoadState('domcontentloaded');
      
      // Verify interactive element bounds (e.g., Save Allocation button)
      const saveBtn = page.locator('button:has-text("Save Allocation")');
      if (await saveBtn.isVisible()) {
        await checkTouchTargetSize(page, 'button:has-text("Save Allocation")', 44, 44);
      }
    });
  });
});
```

---

## Method B: Manual Verification (Browser Developer Tools)

If you are performing local visual audits or validating dynamic animations/interactive hover behavior:

### Step 1: Start the Local Development Server
Make sure the app is running:
```bash
npm run dev
```

### Step 2: Open Device Mode in Chrome DevTools
1. Open [http://localhost:3000](http://localhost:3000) in Google Chrome.
2. Press `Ctrl + Shift + I` (Windows/Linux) or `Cmd + Option + I` (macOS) to open the DevTools panel.
3. Click the **Toggle Device Toolbar** icon (or press `Ctrl + Shift + M` / `Cmd + Shift + M`).

### Step 3: Configure Breakpoint Testing
Instead of choosing pre-defined browser presets, configure custom dimensions to target our exact design breakpoints:
1. Set the dropdown at the top of the viewport to **Responsive**.
2. Manually enter the target widths in the width input field:
   - Test at **320px** (iPhone SE)
   - Test at **375px** (iPhone 14)
   - Test at **450px** (Foldable)
   - Test at **768px** (Tablet Portrait)
   - Test at **1024px** (Tablet Landscape)
   - Test at **1440px** (Desktop)
3. Slowly drag the resize handle from **320px up to 1440px** to ensure that layout blocks wrap smoothly and font/padding transitions occur without awkward text clipping or whitespace issues.

---

## Common Layout Issues & Fixes

When verifying layout behaviors, keep an eye out for these frequent issues:

### 1. Element Clipping / Text Truncation
* **Problem**: Text or buttons inside narrow containers are clipped or overflow because of hardcoded widths (e.g. `w-[200px]`).
* **Fix**: Avoid hardcoded widths on layouts. Use responsive classes like `w-full max-w-xs` or Flexbox/Grid structures (`flex-wrap`, `grid-cols-1 375:grid-cols-2`).

### 2. Tiny Text on Mobile
* **Problem**: Text using standard tailwind `text-xs` (12px) makes forms hard to read and triggers automatic zoom on iOS Safari input fields.
* **Fix**: Ensure body copy and inputs scale progressively using breakpoints:
  ```tsx
  className="text-sm 375:text-base"
  ```

### 3. Too Cramped or Too Spaced Out
* **Problem**: Large padding designed for desktop remains on mobile, squeezing the content width, or padding becomes too sparse.
* **Fix**: Implement progressive padding that adapts across our breakpoints:
  ```tsx
  className="p-5 320:p-6 375:p-7 sm:p-8"
  ```

---

## Related Documentation & Resources
- [Responsive Breakpoint Quick Reference Guide](./RESPONSIVE_BREAKPOINT_GUIDE.md) - Design patterns, spacing tokens, and safe area guides.
- [Responsive Breakpoint Visual Guide](./RESPONSIVE_VISUAL_GUIDE.md) - ASCII wireframe representation of layouts.
- [Layout Configuration](../lib/config/layout.json) - Canonical breakpoint values (consumed by `tailwind.config.js`).
- [Tailwind CSS Configuration File](../tailwind.config.js) - Tailwind theme integration of custom breakpoints.
- [Frontend Testing Guide](./testing.md) - General test suite conventions and execution commands.
