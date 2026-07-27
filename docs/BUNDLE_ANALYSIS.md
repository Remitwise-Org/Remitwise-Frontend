# Bundle Analysis Guide

**Audience:** Contributors (frontend developers)

This document explains how to use the Next.js bundle analyzer to measure, inspect, and optimize the JavaScript bundle size of RemitWise. Maintaining a lean bundle directly impacts our per-route load-time budgets and page performance.

---

## Why Bundle Size Matters

JavaScript is the most expensive resource we deliver to the client. Unlike images or stylesheets, JS must be downloaded, decompressed, parsed, compiled, and finally executed by the browser's main thread. 

An oversized bundle leads to:
- Higher **LCP (Largest Contentful Paint)** and **FCP (First Contentful Paint)** on slow mobile connections.
- Poorer **INP (Interaction to Next Paint)** because the main thread is blocked by parsing heavy scripts.
- Budget failures during our automated performance tests (`npm run test:perf`).

For more details on per-route limits, see [docs/LOAD_TIME_BUDGETS.md](./LOAD_TIME_BUDGETS.md).

---

## Running the Bundle Analyzer

The bundle analyzer is configured to run on top of our production build when the `ANALYZE` environment variable is set to `true`.

### Execution Commands

Depending on your shell, use one of the following commands to start the analysis build:

#### macOS / Linux (bash/zsh)
```bash
ANALYZE=true npm run build
```

#### Windows (PowerShell)
```powershell
$env:ANALYZE="true"; npm run build
```

#### Windows (CMD)
```cmd
set ANALYZE=true && npm run build
```

---

## Locating and Viewing the Reports

When the build finishes, three interactive HTML visualization files are generated in the `.next/analyze/` directory:

1. **`client.html`** - Displays the sizes of chunks sent to the client browser (most critical for user performance).
2. **`server.html`** - Displays the sizes of chunks run on the Node.js server.
3. **`edge.html`** - Displays the sizes of chunks run in Edge middleware environments (e.g., `middleware.ts`).

To view a report, open it directly in any browser. For example:
```bash
# macOS
open .next/analyze/client.html

# Windows
Start-Process .next/analyze/client.html
```

---

## Interpreting the Treemap

The generated report uses an interactive treemap where the area of each block represents its size relative to the bundle.

### 1. Understanding Size Definitions
Hovering over any block in the treemap displays three distinct size metrics:
* **Stat size:** The raw input size of the file before Webpack has processed it (no minification or compression).
* **Parsed size:** The actual size of the JavaScript code after bundling, minification, and tree-shaking. This is the amount of JS the browser has to parse and compile.
* **Gzipped size:** The compressed size of the code sent over the wire. This dictates download speeds and network transmission times.

> [!TIP]
> Always focus on **Parsed size** for execution overhead/main-thread performance, and **Gzipped size** for download performance.

### 2. Identifying Bottlenecks
When reviewing `client.html`, look out for:
* **Large third-party packages** in `node_modules` (e.g., `@stellar/stellar-sdk`, `lucide-react`, or `recharts`).
* **Large application chunks** (e.g., `app/financial-insights/page.js` containing heavy charting configurations).
* **Duplicate dependencies** (e.g., two different versions of the same library nested within other node modules).

---

## Remediation Strategies

If your change increases a route chunk size or introduces a heavy library, use the following techniques to mitigate the impact:

### 1. Dynamic Imports (`next/dynamic`)
Do not bundle heavy components on initial load if they are not immediately visible. Use dynamic imports with `next/dynamic` to split them into separate chunks that load on-demand.

**Example: Dynamically importing a charts library (like Recharts) on the insights page**
```tsx
import dynamic from 'next/dynamic';

const DynamicChart = dynamic(() => import('@/components/analytics/FinancialChart'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-lg" />,
});

export default function FinancialInsightsPage() {
  return (
    <div>
      <h1>Financial Insights</h1>
      <DynamicChart />
    </div>
  );
}
```

### 2. Proper Tree Shaking
Ensure imports are structured so that Webpack can drop unused code. For example, avoid importing the entire library if you only need one function or icon.

**Example: Importing Lucide icons**
```tsx
// ❌ BAD: Destructuring from main package can pull in excess modules in some environments
import { ArrowUpRight } from 'lucide-react';

//  GOOD: Direct path imports guarantee tree-shaking
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
```

### 3. Lightweight Alternatives
If a library is too large, search for lighter alternatives. For example, use standard date-fns instead of moment, or write a lightweight custom SVG if you only need a single complex vector path.
