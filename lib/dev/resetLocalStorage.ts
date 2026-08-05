import { THEME_STORAGE_KEY } from "@/lib/config/theme";
import { DEV_MODE_STORAGE_KEY, DEV_MODE_LATEST_REQUEST_ID_KEY } from "@/lib/config/developer";

/** Query param that triggers `resetLocalStorage()` on load -- see
 * `components/dev/DevResetHandler.tsx`. Paired with the `npm run dev:reset`
 * script, which just prints the URL to visit (a Node script has no way to
 * reach into a running browser's `localStorage` directly). */
export const DEV_RESET_QUERY_PARAM = "dev-reset";

/** Every `localStorage` key this app owns. Kept as one list so `dev:reset`
 * clears the whole set instead of whichever ones someone remembered --
 * add new app-level persisted keys here when they're introduced. */
export const DEV_RESET_LOCAL_STORAGE_KEYS = [
  THEME_STORAGE_KEY,
  "display-density",
  "remitwise_whats_new_last_seen",
  DEV_MODE_STORAGE_KEY,
  DEV_MODE_LATEST_REQUEST_ID_KEY,
] as const;

/** Clears every key in {@link DEV_RESET_LOCAL_STORAGE_KEYS} so a developer
 * can get back to a fresh first-visit client state (theme, density,
 * "what's new" seen-state, dev mode) without manually clearing browser
 * storage. Safe to call on the server -- it's a no-op without `window`. */
export function resetLocalStorage(): void {
  if (typeof window === "undefined") return;

  for (const key of DEV_RESET_LOCAL_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}
