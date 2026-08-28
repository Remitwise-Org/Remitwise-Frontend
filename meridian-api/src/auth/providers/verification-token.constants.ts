/**
 * Verification-token TTL (issue #435).
 *
 * 24 hours is a sensible default — long enough for the user to find the
 * email and click the link, short enough to limit window-of-abuse if a
 * token leaks. Reads from VERIFICATION_TOKEN_TTL_HOURS env var if set.
 */
export const VERIFICATION_TTL_MS: number =
  (() => {
    const hours = Number(process.env.VERIFICATION_TOKEN_TTL_HOURS);
    return Number.isFinite(hours) && hours > 0 ? hours : 24;
  })() *
  60 *
  60 *
  1000;
