export const PAGE_HEADING_LINK_FEEDBACK_MS = 2000;

export type CanonicalHeadingLocation = Pick<Location, "origin" | "pathname">;

export function buildCanonicalHeadingUrl(
  location: CanonicalHeadingLocation,
  headingId: string,
): string {
  return `${location.origin}${location.pathname}#${headingId}`;
}

function fallbackCopyText(text: string): void {
  if (typeof document === "undefined") {
    throw new Error("Clipboard fallback is unavailable.");
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, text.length);

  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Clipboard copy failed.");
  }
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  fallbackCopyText(text);
}
