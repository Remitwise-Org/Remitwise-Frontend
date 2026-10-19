/**
 * Validates that an uploaded file's MIME type is an accepted image type.
 * Rejects at this boundary -- before the file is read, previewed, or sent
 * anywhere -- rather than letting a non-image file (a PDF, an executable
 * with a spoofed extension, etc.) reach code that assumes image data.
 *
 * Checks `file.type` (the browser-reported MIME type), not the filename
 * extension, which is easy to spoof and doesn't reflect actual content.
 */

export const ACCEPTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];

export type ImageMimeTypeValidationResult =
  | { ok: true }
  | { ok: false; error: 'missing_mime_type' | 'unsupported_mime_type'; mimeType: string };

export function validateImageMimeType(
  file: Pick<File, 'type'>
): ImageMimeTypeValidationResult {
  const mimeType = file.type;

  if (!mimeType) {
    return { ok: false, error: 'missing_mime_type', mimeType };
  }

  if (!(ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { ok: false, error: 'unsupported_mime_type', mimeType };
  }

  return { ok: true };
}
