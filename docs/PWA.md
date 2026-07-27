# Progressive Web App (PWA): Installation & Update Behavior

This document explains how the RemitWise frontend behaves as a PWA, how users install it on different browsers, and how updates reach existing installations. It is aimed at **contributors** who need to understand, test, or modify the PWA layer.

> **Current status:** PWA support is not yet enabled. This document describes the intended behavior once the service worker, manifest, and associated configuration are in place. See [Adding PWA support](#adding-pwa-support) for the implementation guide.

---

## Installation

A PWA can be installed when the browser detects a valid [Web App Manifest](#manifest) and a registered [service worker](#service-worker) that handles the `fetch` event. The exact installation UX differs by browser.

### Chrome & Edge (Chromium)

| Step | Behavior |
|---|---|
| First visit | The browser downloads the manifest and registers the service worker in the background. |
| Visit count / engagement | Chrome's [installability criteria](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest/) require ~30 seconds of engagement and a registered `fetch` handler. Edge follows the same heuristic. |
| Prompt | The `beforeinstallprompt` event fires automatically. The browser shows an **Install** button in the omnibox. |
| User-initiated | Users can also select **Install RemitWise...** from the browser menu (⋮ → Cast, save, and share → Install page). |
| Installed app | Opens in a separate window with no browser chrome (address bar, tabs). The app window title and icon come from the manifest. |

### Firefox (Desktop)

Firefox [does not support](https://support.mozilla.org/en-US/kb/pwas) the `beforeinstallprompt` event on desktop. Users cannot install the PWA through the browser UI. Firefox Android supports installation via the `beforeinstallprompt` event.

### Safari (macOS 14+ / iOS 16.4+)

| Step | Behavior |
|---|---|
| Share sheet | Tap the **Share** button (square with arrow) → **Add to Dock** (macOS) or **Add to Home Screen** (iOS). |
| No `beforeinstallprompt` | Safari does not fire `beforeinstallprompt`. Installation is always user-initiated via the share sheet. |
| Installed app (iOS) | Opens in a standalone Safari web view. No browser chrome, but shares the Safari cookie/ storage partition. |
| Installed app (macOS) | Opens as a separate app window via Safari's "Add to Dock". |
| Badge / icon | Uses the `apple-touch-icon` meta tag for the home-screen icon. Falls back to a screenshot of the page if no tag is present. |

> **iOS limitation:** Push notifications require the Push API, which Safari only supports conditionally. See [Browser-specific limitations](#ios-safari) below.

---

## Updates

PWA updates are driven by the **service worker lifecycle**. The server never pushes an update; instead the browser checks for a new service worker script on every navigation and when `ServiceWorkerRegistration.update()` is called.

### Service worker lifecycle

```
Installing  →  Installed (waiting)  →  Activating  →  Activated
                                                        │
                                         (on all controlled clients)
```

### Update detection

1. The browser re-fetches `sw.js` (or the configured service worker URL) on every navigation to a page in scope, and every 24 hours even without navigation.
2. If the new script is **byte-different** from the currently active version, the browser treats it as an update.
3. The new service worker enters the **waiting** state — it does *not* take control until all existing tabs/windows of the app are closed.
4. On the next launch (or after closing all tabs), the waiting service worker activates and takes control.

### Instant updates

To avoid leaving users on an old version, the service worker can call [`self.skipWaiting()`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting) during the `install` event and [`self.clients.claim()`](https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim) during the `activate` event.

With this pattern:

- The new service worker activates as soon as it finishes installing, without waiting for tab closure.
- It takes control of all open clients (tabs) immediately.
- The next page navigation or `fetch` request uses the new service worker.

**Trade-off:** Active pages that hold stale React state may behave unexpectedly if the underlying cache schema changes. If instant updates are enabled, the app should listen for `controllerchange` events on `navigator.serviceWorker` and notify or reload the page.

### When users receive new versions

| Update type | Default behavior | With `skipWaiting()` + `clients.claim()` |
|---|---|---|
| Same session (tab open) | On next launch (after all tabs closed) | Immediately on next navigation |
| New session (fresh open) | The latest service worker is used | The latest service worker is used |
| Cache-only change | Updated on next fetch after activation | Updated on next fetch after activation |

---

## Browser-specific limitations

### iOS Safari

| Limitation | Detail |
|---|---|
| Push notifications | Not supported for home-screen web apps (iOS 16.x). iOS 17+ supports Push API but requires the app to have been added to the home screen and the user to grant permission. |
| Service worker scope | Service workers are supported since iOS 16.4, but with a smaller `Cache` storage quota (~50 MB). |
| Beforeinstallprompt | Not fired. Users must use the share sheet → "Add to Home Screen". |
| Cookie partitioning | Installed apps share cookies with Safari, not a separate profile. Unexpected logout occurs if the user clears Safari cookies. |
| `system` font scaling | iOS respects only `standard` or `text` accessibility settings; `system` scaling is not available for installed PWAs. |

### Firefox

| Limitation | Detail |
|---|---|
| Desktop installation | Not supported. Firefox does not fire `beforeinstallprompt` on desktop. The application will not appear in the "installable apps" list. |
| Push API | Supported on Android only. |
| Cache API | Supported with standard quota. |

### Chromium (Chrome / Edge)

No significant PWA limitations. Both browsers fully support the manifest, service worker, push notifications, and background sync.

---

## Testing installation and updates locally

### 1. Register a service worker for development

Create a minimal service worker file at `public/sw.js`:

```js
// public/sw.js
const CACHE = "remitwise-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/"]))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

Register it in `app/layout.tsx` or a client component:

```tsx
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  return null;
}
```

### 2. Verify installation

Run the production build and serve it locally to test PWA installability:

```bash
npm run build
npx serve@latest out -l 3000
```

Open Chrome DevTools → **Application** → **Manifest** to confirm the manifest loads. Use the **Application** → **Service Workers** panel to inspect registration status.

### 3. Lighthouse audit

```bash
npm run build
npx lighthouse http://localhost:3000 \
  --view \
  --preset=desktop \
  --only-categories=pwa
```

The PWA category checks installability, service worker registration, `start_url` response, and HTTPS (localhost is treated as secure).

### 4. Test update flow

1. Open the app in a Chrome tab.
2. Modify `public/sw.js` (e.g., change the cache name to `remitwise-v2`).
3. Reload the page — the new service worker is detected.
4. In DevTools → **Application** → **Service Workers**, observe the new worker in **waiting** state.
5. Close all tabs, reopen — the new worker activates.
6. To test instant updates, click **skipWaiting** in DevTools or invoke `self.skipWaiting()` in the `install` handler.

### 5. Clear service workers & caches during development

```js
// Paste in DevTools console
navigator.serviceWorker.getRegistrations().then((regs) =>
  Promise.all(regs.map((r) => r.unregister()))
);
caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
location.reload();
```

---

## Adding PWA support

PWA requires three pieces: a **manifest**, a **service worker**, and a **build plugin** that generates the service worker with precaching.

### 1. Install `@serwist/next`

```bash
npm install @serwist/next
```

### 2. Create the manifest

Add `public/manifest.json`:

```json
{
  "name": "RemitWise",
  "short_name": "RemitWise",
  "description": "A remittance app that helps families save, plan, and protect — not just send money.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a1a",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/logo.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

Link it in `app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  // ... existing metadata ...
  manifest: "/manifest.json",
};
```

### 3. Create the service worker entry point

Create `sw/sw.ts`:

```ts
import { defaultCache } from "@serwist/next/worker";
import { PrecacheEntry, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

### 4. Update `next.config.js`

```js
const withSerwistInit = require("@serwist/next").default;

const withSerwist = withSerwistInit({
  swSrc: "sw/sw.ts",
  swDest: "public/sw.js",
});

module.exports = withSerwist(
  withSentryConfig(
    { ...nextConfig, rewrites, redirects },
    sentryWebpackPluginOptions
  )
);
```

### 5. Build and verify

```bash
npm run build
```

`@serwist/next` compiles `sw/sw.ts` → `.next/sw.js` during the build. The file is served as a static asset via the `public/` mapping.

---

## Key files

| File | Purpose |
|---|---|
| `public/manifest.json` | Web App Manifest — name, icons, display mode |
| `sw/sw.ts` | Service worker entry point (compiled by `@serwist/next`) |
| `public/sw.js` | Compiled service worker output |
| `app/layout.tsx` | Manifest `<link>` tag + optional registration script |
| `next.config.js` | `@serwist/next` plugin wrapping the config |

---

## References

- [Web App Manifest specification](https://www.w3.org/TR/appmanifest/)
- [Service Worker API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [@serwist/next documentation](https://serwist.pages.dev/)
- [Chrome PWA installability criteria](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest/)
- [Safari PWA support (WebKit blog)](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Performance budgets](./LOAD_TIME_BUDGETS.md) — PWA installation is measured as part of load-time budgets
