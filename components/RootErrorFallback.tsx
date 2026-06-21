"use client";

import { AlertCircle, Home } from "lucide-react";
import { useEffect, useRef } from "react";
import { useClientTranslator } from "@/lib/i18n/client";

interface RootErrorFallbackProps {
  onReset: () => void;
}

/**
 * Minimal shell-level crash fallback that avoids depending on the app subtree
 * that just failed to render.
 */
export default function RootErrorFallback({ onReset }: RootErrorFallbackProps) {
  const { t } = useClientTranslator();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-white sm:px-6">
      <section
        role="alert"
        aria-live="assertive"
        aria-labelledby="root-error-heading"
        aria-describedby="root-error-description"
        className="flex w-full max-w-xl flex-col items-center justify-center gap-5 rounded-lg border border-[#DC2626]/40 bg-black/80 px-5 py-10 text-center shadow-2xl shadow-black/40 sm:px-8"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#DC2626]/40 bg-[#DC2626]/10 text-[#DC2626]">
          <AlertCircle className="h-7 w-7" aria-hidden="true" />
        </span>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#DC2626]">
            {t("rootError.eyebrow", "Application error")}
          </p>
          <h1
            ref={headingRef}
            id="root-error-heading"
            tabIndex={-1}
            className="text-balance text-2xl font-semibold text-white focus:outline-none sm:text-3xl"
          >
            {t("rootError.title", "Something went wrong")}
          </h1>
          <p
            id="root-error-description"
            className="mx-auto max-w-md text-sm leading-6 text-white/60"
          >
            {t(
              "rootError.description",
              "We hit an unexpected problem, but your session is still safe. Try reloading this view or return home."
            )}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 rounded-lg border border-[#DC2626]/40 bg-[#DC2626]/10 px-5 py-2.5 text-sm font-semibold text-[#DC2626] transition-colors motion-reduce:transition-none hover:bg-[#DC2626]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
          >
            {t("rootError.tryAgain", "Try again")}
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors motion-reduce:transition-none hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            {t("rootError.home", "Go home")}
          </a>
        </div>
      </section>
    </main>
  );
}
