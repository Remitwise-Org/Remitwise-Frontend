// CLI wrapper run from .github/workflows/preview.yml. Reads the deploy
// output and commit sha from the environment and writes a `body` output
// (GitHub Actions multiline format) for the sticky-pull-request-comment step.
import { appendFileSync } from "node:fs";
import { formatPreviewComment } from "./format-preview-comment.mjs";

const body = formatPreviewComment({
  url: process.env.PREVIEW_URL,
  sha: process.env.GITHUB_SHA,
});

const outputPath = process.env.GITHUB_OUTPUT;
if (!outputPath) {
  throw new Error("emit-preview-comment: GITHUB_OUTPUT is not set");
}

const delimiter = "PREVIEW_COMMENT_EOF";
appendFileSync(outputPath, `body<<${delimiter}\n${body}\n${delimiter}\n`);
