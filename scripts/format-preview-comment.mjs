// Pure formatter for the sticky PR comment posted by
// .github/workflows/preview.yml after a successful Vercel preview deploy.
// Kept separate from scripts/emit-preview-comment.mjs so it can be unit
// tested without a GitHub Actions environment.
export function formatPreviewComment({ url, sha }) {
  if (!url) {
    throw new Error("formatPreviewComment: a preview url is required");
  }

  const shortSha = (sha || "").slice(0, 7);

  return [
    "### Preview deployment",
    "",
    `**URL:** ${url}`,
    shortSha ? `**Commit:** \`${shortSha}\`` : null,
    "",
    "_This preview updates automatically on every push to this PR._",
  ]
    .filter((line) => line !== null)
    .join("\n");
}
