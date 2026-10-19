# SSR vs. Client-Only Patterns Guide

Audience: This document is written for **contributors** building features, pages, or components in the RemitWise frontend.

It outlines our patterns and conventions for Server-Side Rendering (SSR) and Client-Only components using Next.js 14 App Router, detailing what works in SSR versus client-only environments, how to manage the server/client boundary safely, and how to avoid hydration mismatch errors or security issues.

---

## 1. Architectural Overview & Boundary Rules

Next.js 14 App Router uses **Server Components by default**. All files under `app/` render on the server during initial request time or build time unless explicitly declared with the `'use client'` directive.

### Server vs. Client Mental Model
- **Server Components (SSR)**: Render on the Node.js server. Output standard HTML and CSS sent to the browser. Zero client JavaScript bundle weight.
- **Client Components (`'use client'`)**: Pre-rendered to HTML on the server during initial load, then hydrated with JavaScript in the browser to enable interactivity, state, and browser API calls.

### Data Flow Rules
1. **Server to Client**: Server Components can import and render Client Components. Props passed from Server to Client Components MUST be serializable (JSON-compatible: primitives, plain objects, arrays, booleans, null/undefined).
2. **Client to Server**: Client Components **cannot** import Server Components directly. However, Client Components can accept Server Components as `children` or `ReactNode` props.

---

## 2. Server-Side Rendering (SSR) Patterns

Server Components run strictly in Node.js during request handling or build time. They have direct access to database models, environment secrets, and backend services without exposing sensitive logic to the client.

### A. Direct Database & RPC Fetching in Async Server Components
Server Components use standard `async/await` syntax to query the Prisma database or Stellar Horizon endpoints directly.

**Concrete Example (`app/receipt/[txHash]/page.tsx`):**
```tsx
import { fetchTransactionReceipt, isValidTxHash } from "@/lib/remittance/horizon";
import ReceiptPageContent from "@/components/ReceiptPageContent";
import type { ReceiptData } from "@/lib/remittance/horizon";

type Props = {
  params: Promise<{ txHash: string }>;
};

export default async function ReceiptPage({ params }: Props) {
  const { txHash } = await params;
  let receiptData: ReceiptData | null = null;
  let notFound = false;

  if (isValidTxHash(txHash)) {
    try {
      receiptData = await fetchTransactionReceipt(txHash);
    } catch {
      notFound = true;
    }
  }

  return <ReceiptPageContent txHash={txHash} initialData={receiptData} notFound={notFound} />;
}
```

### B. Static & Dynamic SEO Metadata
Server Components can export static `metadata` objects or `generateMetadata` functions. Next.js automatically injects these into `<head>` before streaming HTML to the client.

**Dynamic Metadata (`app/receipt/[txHash]/page.tsx`):**
```tsx
import { Metadata } from "next";
import { RECEIPT_SEO, SITE_URL } from "@/lib/config/seo";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { txHash } = await params;
  const isValid = isValidTxHash(txHash);
  const title = isValid
    ? `Receipt ${txHash.substring(0, 8)}… | RemitWise`
    : RECEIPT_SEO.titlePrefix;

  return {
    title,
    description: isValid ? `View receipt for ${txHash}…` : RECEIPT_SEO.description,
    openGraph: { title, url: `${SITE_URL}/receipt/${txHash}` },
  };
}
```

**Static Metadata (`app/api/docs/page.tsx`):**
```tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation - RemitWise',
  description: 'Complete API documentation for RemitWise remittance and financial planning services',
};
```

### C. Accessing Server Secrets & Private Modules
Server Components and API route handlers can safely import server-only secrets (e.g. `DATABASE_URL`, `AUTH_SECRET`, `SOROBAN_RPC_URL`, `SENTRY_DSN`) and Node modules (`crypto`, `fs`, `iron-session`) without leaking them to the client bundle.

---

## 3. Client-Only Component Patterns (`'use client'`)

Mark components with `'use client'` at the top of the file when you require state, effects, event handlers, or browser APIs.

### A. Browser API Access & Wallet Integration
Browser APIs (`window`, `localStorage`, `navigator.clipboard`, wallet extensions like `window.freighterApi`) are only available on the client.

**Concrete Example (`components/ui/AddressDisplay.tsx`):**
```tsx
'use client';

import * as React from 'react';
import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard';
import { useToast } from '@/lib/context/ToastContext';
import { truncateMiddle } from '@/utils/text';

export const AddressDisplay = React.forwardRef<HTMLDivElement, AddressDisplayProps>(
  ({ address, chars = 6, copyable = true, className, ...props }, ref) => {
    const { copy, status } = useCopyToClipboard();
    const { toast } = useToast();

    const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      copy(address).then(() => {
        toast({
          title: 'Copied to clipboard',
          description: `Address: ${truncateMiddle(address, 12)}`,
        });
      });
    };

    return (
      <div ref={ref} className={className} {...props}>
        <span>{truncateMiddle(address, chars)}</span>
        {copyable && <button onClick={handleCopy}>Copy</button>}
      </div>
    );
  }
);
```

### B. Client-Side SEO Hook (`useSeo`)
For routes that render dynamic metadata strictly on the client side, use the `useSeo` hook (`lib/hooks/useSeo.ts`).

**Concrete Example (`app/send/page.tsx`):**
```tsx
"use client";

import { useSeo } from "@/lib/hooks/useSeo";

export default function SendPage() {
  useSeo({
    title: "Send Money | RemitWise",
    description: "Send instant remittances with automatic split configuration.",
  });

  return <main>{/* Send form content */}</main>;
}
```

### C. Client API Layer (`apiClient`)
When Client Components need to fetch data or submit requests to `/api/...` endpoints, use `apiClient` (`lib/client/api-client.ts`) or `fetchWithTimeout` rather than raw `fetch`. `apiClient` handles 401 token refresh, request headers, timeouts, and session expiration UI surfacing automatically.

---

## 4. Hydration & Safe SSR Boundary Patterns

Client Components are still pre-rendered on the server during initial page render. If a Client Component accesses browser-only APIs or non-deterministic values during that initial render, Next.js throws a Hydration Error.

### A. Guarding Browser APIs with Mount State or `useEffect`
To avoid hydration errors when accessing `window` or `localStorage`, check if the component is mounted or check `typeof window !== 'undefined'`.

**Concrete Example (`app/api/docs/SwaggerUIWrapper.tsx`):**
```tsx
'use client';

import { useEffect, useState } from 'react';

export default function SwaggerUIWrapper({ specUrl }: { specUrl: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading API Documentation...</p>
      </div>
    );
  }

  return <SwaggerUI specUrl={specUrl} />;
}
```

### B. Lazy Loading Client-Only Components with `next/dynamic`
If a third-party package relies on browser globals and breaks during server pre-rendering, lazy-load it with `ssr: false`:

```tsx
import dynamic from 'next/dynamic';

const DynamicChart = dynamic(() => import('@/components/InteractiveChart'), {
  ssr: false,
  loading: () => <p>Loading chart...</p>,
});
```

### C. Skeleton Fallbacks & Suspense Boundaries
For fast initial paint during SSR, wrap slow async Server Components with `Suspense` and fallback loading skeletons from `components/ui/Skeleton.tsx`.

```tsx
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import AsyncDashboardContent from '@/components/AsyncDashboardContent';

export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AsyncDashboardContent />
      </Suspense>
    </main>
  );
}
```

---

## 5. Anti-Patterns & Common Pitfalls

| Anti-Pattern | Why It Fails | Safe Alternative |
|---|---|---|
| **Accessing `window` / `localStorage` outside `useEffect` or un-guarded during SSR** | Causes `ReferenceError: window is not defined` during server render or Hydration mismatch in client. | Guard with `useEffect(() => setMounted(true), [])` or `typeof window !== 'undefined'`. |
| **Importing `@prisma/client`, `iron-session`, or private secret env vars in `'use client'` files** | Exposes database schemas/keys or breaks client build bundle. | Keep DB/secret logic in Server Components or API Route Handlers under `app/api/`. |
| **Using `useState`, `useEffect`, or `useSeo` in Server Components** | Next.js build error: Client hooks are invalid in Server Components. | Add `'use client'` to component file header or delegate interactivity to a child Client Component. |
| **Rendering non-deterministic values (e.g. `new Date()`, `Math.random()`) directly in render** | HTML rendered on server differs from HTML generated on client, causing Hydration Mismatch. | Move dynamic value calculation into `useEffect` or state set after mount. |
| **Passing non-serializable props (Functions, Promises, Classes) from Server to Client Component** | React serialization error: Props passed to Client Components must be plain JSON objects or primitives. | Pass plain data objects/arrays, or handle callback logic within the Client Component. |

---

## 6. Summary Quick Reference Matrix

| Concern / Capability | Server Component | Client Component | Directive Required |
|---|---|---|---|
| Direct Prisma DB Querying | ✅ Supported | ❌ Forbidden | None (Default) |
| Read Server Secrets (`AUTH_SECRET`) | ✅ Supported | ❌ Leaks Secret | None (Default) |
| `export async function generateMetadata` | ✅ Supported | ❌ Unsupported | None (Default) |
| Read Browser APIs (`window`, `localStorage`) | ❌ Undefined | ✅ Supported (Guarded) | `'use client'` |
| `useState`, `useEffect`, `useRef` | ❌ Invalid | ✅ Supported | `'use client'` |
| `useSeo` Dynamic Hook | ❌ Invalid | ✅ Supported | `'use client'` |
| User Events (`onClick`, `onChange`) | ❌ Invalid | ✅ Supported | `'use client'` |
| Wallet Connection (`window.freighterApi`) | ❌ Undefined | ✅ Supported | `'use client'` |
| `apiClient` / `fetchWithTimeout` | ⚠️ Use direct fetch | ✅ Recommended | `'use client'` |

---

## Related Documentation

- [Architecture Overview](architecture.md)
- [Routing Patterns](ROUTING_PATTERNS.md)
- [Component Lifecycle](COMPONENT_LIFECYCLE.md)
- [Cache Strategy](CACHE_STRATEGY.md)
- [Client API Guide](client-api.md)
- [Component States Guide](component-states.md)
