import * as path from 'path';

/**
 * Sanitizes an uploaded filename so it is safe to use on disk or as an S3 key.
 *
 * Rules applied (in order):
 *  1. Strip any leading directory components (path traversal prevention).
 *  2. Extract the last extension only — prevents double-extension attacks
 *     (e.g. "malware.php.png" → extension kept is ".png").
 *  3. Replace every character that is not alphanumeric, a hyphen, or an
 *     underscore with "_".  Dots are preserved only in the single extension.
 *  4. Collapse consecutive underscores to a single underscore.
 *  5. Prefix with a millisecond timestamp to guarantee uniqueness and avoid
 *     name collisions.
 *
 * @param originalName – the raw `file.originalname` from multer
 * @returns a safe, unique filename string (no path separator, no "..")
 */
export function sanitizeFilename(originalName: string): string {
  // 1. Prevent path traversal — keep only the base part.
  const base = path.basename(originalName);

  // 2. Extract the final extension only (defends against double extensions).
  const ext = path.extname(base).toLowerCase(); // e.g. ".png"
  const nameWithoutExt = path.basename(base, ext); // e.g. "malware.php"

  // 3. Sanitize the stem: allow only alphanumerics, hyphens, underscores.
  const safeStem = nameWithoutExt.replace(/[^a-zA-Z0-9\-]/g, '_');

  // 4. Collapse consecutive underscores/hyphens for readability.
  const cleanStem = safeStem.replace(/_+/g, '_').replace(/-+/g, '-');

  // 5. Sanitize extension characters (should only be alpha, but be safe).
  const safeExt = ext.replace(/[^a-z0-9.]/g, '');

  // 6. Timestamp prefix for uniqueness.
  return `${Date.now()}-${cleanStem}${safeExt}`;
}
