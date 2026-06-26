# Primary CTA Test IDs

Route-level primary CTAs and the main submit or confirm buttons in core user flows expose stable `data-testid` hooks from `lib/cta-testids.ts`.

## Scope

Only primary CTAs are in scope:

- route-level page actions such as header CTAs and export buttons
- main flow submit or confirm actions such as send, split configuration, and emergency transfer steps

Out of scope:

- secondary actions
- widget CTAs
- modal close buttons
- utility buttons

## Naming Convention

- page-level CTA: `<route>-primary-cta`
- primary flow submit or confirm CTA: `<flow>-<step>-primary-cta`

Use explicit stable names from `lib/cta-testids.ts`. Do not derive ids from button text.

## Usage

- Reusable CTA-bearing components should accept an optional test id prop when needed, such as `PageHeader`.
- Single-use page buttons can read directly from `CTA_TEST_IDS`.
- New Playwright specs should prefer `getByTestId` over visible-text selectors for these primary CTAs.
