/**
 * Validates that an uploaded file doesn't exceed the client-side size cap.
 * Threat-modeled boundary: without this, a user (or a malicious script
 * driving the file input) could hand a multi-gigabyte file to code that
 * reads it into memory (e.g. `FileReader.readAsDataURL`) or uploads it,
 * hanging or crashing the tab and wasting the user's bandwidth long before
 * any server-side limit gets a chance to reject it.
 */

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB

export type FileSizeValidationResult =
  | { ok: true }
  | { ok: false; error: 'file_too_large'; sizeBytes: number; maxSizeBytes: number };

export function validateFileSize(
  file: Pick<File, 'size'>,
  maxSizeBytes: number = MAX_UPLOAD_SIZE_BYTES
): FileSizeValidationResult {
  if (file.size > maxSizeBytes) {
    return {
      ok: false,
      error: 'file_too_large',
      sizeBytes: file.size,
      maxSizeBytes,
    };
  }
  return { ok: true };
}
