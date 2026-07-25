"use client";

import { Check, Hash } from "lucide-react";
import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import {
  buildCanonicalHeadingUrl,
  copyTextToClipboard,
  PAGE_HEADING_LINK_FEEDBACK_MS,
} from "@/lib/client/pageHeadingLink";

type PageHeadingLinkProps = {
  headingId: string;
  copyHeadingId?: string;
  label: string;
  children: ReactNode;
  as?: ElementType;
  wrapperClassName?: string;
  headingClassName?: string;
  buttonClassName?: string;
  iconClassName?: string;
};

const DEFAULT_WRAPPER_CLASS =
  "flex min-w-0 items-center gap-2";
const DEFAULT_BUTTON_CLASS =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/15 text-current/70 transition-colors hover:bg-current/10 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
const DEFAULT_ICON_CLASS = "h-4 w-4";

export default function PageHeadingLink({
  headingId,
  copyHeadingId = headingId,
  label,
  children,
  as: HeadingTag = "h1",
  wrapperClassName = DEFAULT_WRAPPER_CLASS,
  headingClassName,
  buttonClassName = DEFAULT_BUTTON_CLASS,
  iconClassName = DEFAULT_ICON_CLASS,
}: PageHeadingLinkProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const canonicalUrl = buildCanonicalHeadingUrl(window.location, copyHeadingId);
      await copyTextToClipboard(canonicalUrl);
      setCopied(true);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, PAGE_HEADING_LINK_FEEDBACK_MS);
    } catch {
      setCopied(false);
    }
  };

  const buttonLabel = copied ? `Copied link to ${label}` : `Copy link to ${label}`;

  return (
    <div className={wrapperClassName}>
      <HeadingTag id={headingId} className={headingClassName}>
        {children}
      </HeadingTag>
      <button
        type="button"
        onClick={handleCopy}
        className={buttonClassName}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        {copied ? (
          <Check className={iconClassName} aria-hidden="true" />
        ) : (
          <Hash className={iconClassName} aria-hidden="true" />
        )}
        <span className="sr-only">{buttonLabel}</span>
      </button>
    </div>
  );
}
