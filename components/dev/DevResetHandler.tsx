"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DEV_RESET_QUERY_PARAM, resetLocalStorage } from "@/lib/dev/resetLocalStorage";

/** Watches for `?dev-reset` (added by visiting the URL the `npm run
 * dev:reset` script prints), clears every app-owned `localStorage` key,
 * then strips the param so a page refresh doesn't clear storage again. */
function DevResetHandlerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!searchParams.has(DEV_RESET_QUERY_PARAM)) return;

    resetLocalStorage();

    const remaining = new URLSearchParams(searchParams);
    remaining.delete(DEV_RESET_QUERY_PARAM);
    const query = remaining.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

export default function DevResetHandler() {
  return (
    <Suspense fallback={null}>
      <DevResetHandlerInner />
    </Suspense>
  );
}
