# Security

This document outlines the security strategies and mechanisms employed in the RemitWise Frontend, with a focus on defense-in-depth measures against Cross-Site Scripting (XSS).

## Content Security Policy (CSP)

A Content Security Policy (CSP) is implemented globally via `middleware.ts`. The CSP provides an added layer of protection by defining which dynamic resources are allowed to load.

### CSP Strategy

The application uses two distinct CSP strategies:

1. **API Routes (`/api/*`)**:
   API endpoints return a highly restrictive policy:
   `default-src 'none'; frame-ancestors 'none'; base-uri 'none'`
   APIs do not return HTML, so they do not need to execute scripts or load styles. This strict policy ensures that even if an attacker manages to spoof an API response as HTML, no scripts can be executed.

2. **Frontend Pages**:
   For all other routes (the rendering layer), the middleware applies a strict, nonce-based CSP:
   ```
   default-src 'self';
   script-src 'self' 'nonce-<dynamic-nonce>' 'strict-dynamic';
   style-src 'self' 'unsafe-inline';
   img-src 'self' blob: data:;
   font-src 'self';
   object-src 'none';
   base-uri 'self';
   form-action 'self';
   frame-ancestors 'none';
   block-all-mixed-content;
   upgrade-insecure-requests;
   ```

### Why Inline Scripts Are Disallowed

Allowing `unsafe-inline` inside `script-src` defeats the primary purpose of a CSP. If `unsafe-inline` is permitted, an attacker who successfully injects a malicious `<script>` block into the DOM (e.g., via unescaped user input) can immediately execute JavaScript.

By explicitly omitting `unsafe-inline` from `script-src`, the browser will refuse to execute any script tag unless it contains a valid, cryptographic `nonce`.

### How Nonces Work

A "nonce" (number used once) is a securely generated, random Base64 string (`crypto.randomUUID()`) created on every incoming request.

1. The middleware generates the nonce.
2. The middleware adds the nonce to the `Content-Security-Policy` HTTP response header.
3. The middleware passes the nonce to the Next.js rendering layer via the `x-nonce` request header.
4. `app/layout.tsx` reads the nonce (`headers().get('x-nonce')`) and applies it to custom inline scripts (like the theme detection script).
5. Next.js automatically detects the `x-nonce` header and attaches the same nonce to its internal framework hydration scripts.

When the browser parses the HTML, it compares the `nonce` attribute on each `<script>` tag against the nonce declared in the CSP header. If they match, the script executes. If they don't, the script is blocked and an error is logged to the console.

### How New Scripts Should Be Added

If you need to add a new inline script or a third-party script, you **must** provide the generated nonce.

**Adding an inline script in a Server Component:**
```tsx
import { headers } from "next/headers";

export default function MyComponent() {
  const nonce = headers().get("x-nonce") || "";
  return (
    <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `console.log('Safe!')` }} />
  );
}
```

> **Warning:** Do not use `dangerouslySetInnerHTML` with untrusted user input, even with a nonce. Nonces prevent attacker-injected `<script>` tags, but they do not protect against payload injection *within* your own authorized script blocks.

### Developer Guidance
- **Never weaken the CSP.** Do not add `unsafe-inline` to `script-src` under any circumstances.
- **Third-party scripts:** Avoid them if possible. If required, use Next.js `<Script>` components which will automatically inherit the nonce from the request headers.
- **Client Components:** The `headers()` API is only available in Server Components. If a Client Component requires the nonce, it must be passed down as a prop from a Server Component parent.
