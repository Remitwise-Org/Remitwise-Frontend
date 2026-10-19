/**
 * Strips HTML tags from pasted text. `textarea`/`input` elements only ever
 * store plain text -- pasting can't inject a rendered `<script>` into
 * them -- but a clipboard payload that carries an HTML MIME type (e.g.
 * copied from a web page or a rich editor) can still carry raw markup as
 * its *plain-text* representation on some browsers/clipboard managers.
 * This strips it so what lands in the field is always plain prose, not
 * literal tag soup, regardless of what produced the clipboard content.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Reads plain text out of a paste event, stripping any HTML tags, and
 * splices it into `currentValue` at the given selection -- the same
 * insert-at-cursor behavior the browser's default paste would have done.
 */
export function sanitizePastedValue(
  clipboardData: DataTransfer,
  currentValue: string,
  selectionStart: number,
  selectionEnd: number
): string {
  const pasted = stripHtml(clipboardData.getData("text/plain"));
  return currentValue.slice(0, selectionStart) + pasted + currentValue.slice(selectionEnd);
}
