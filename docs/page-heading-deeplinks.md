# Page Heading Deep Links

Primary page titles in RemitWise include an inline hash-link button that copies the canonical page URL with a stable heading hash.

## Rules

- Scope is primary route-level page titles only.
- Do not add this control to section headings, widget headings, or modal headings.
- Use an explicit stable heading id per route, such as `bills-page-heading`.
- Keep ids stable across copy edits, translations, and design changes.

## URL format

Copied links use:

`origin + pathname + #headingId`

The copied URL does not include the current query string or any existing hash.

## Feedback behavior

- Clicking the inline hash button copies the canonical URL.
- The control shows inline success feedback briefly.
- The click does not mutate the current URL or trigger toast feedback.

## Implementation note

Use the shared `PageHeadingLink` primitive for new primary page titles. Shared header components should pass an explicit `headingId` so page-level routes keep a stable canonical link target.
