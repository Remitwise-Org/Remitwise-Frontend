# Figma handoff workflow

Audience: contributors turning RemitWise design specs into frontend work.

This workflow explains how designers should hand off implementation-ready Figma
specs to engineers, and what engineers should expect to receive before they
start building. The goal is to make the handoff concrete enough that reviewers
can compare the code to the documented intent instead of reverse-engineering it
from comments or past pull requests.

## What a complete handoff must answer

Before engineering starts, a Figma handoff should make these items explicit:

1. **Which route or component is changing?**
2. **Which breakpoints are approved?**
3. **Which user states are required?**
4. **Which existing tokens and patterns should be reused?**
5. **Which behaviors are final, and which are still open questions?**

If one of those answers is missing, the handoff is not ready.

## Start from a real production entrypoint

Every handoff should point to the actual Next.js route or component entrypoint,
not just a feature name.

Use project-relative paths in the handoff:

```text
/dashboard -> app/dashboard/page.tsx
/dashboard -> app/dashboard/layout.tsx
/dashboard/goals -> app/dashboard/goals/page.tsx
/send -> app/send/page.tsx
/transactions -> app/transactions/page.tsx
```

That mapping lets engineers, reviewers, and support quickly verify whether the
implementation matches the intended screen.

## Required sections in a Figma handoff

Use `docs/DESIGN_HANDOFF_TEMPLATE.md` as the starting point. At minimum, the
handoff should include these sections.

### 1. Route mapping

Name the user-facing route and the production file that renders it.

Example:

```md
## Route Mapping
- Route: `/dashboard`
- Next.js file: `app/dashboard/page.tsx`
- Shared layout: `app/dashboard/layout.tsx`
```

### 2. Design source

Include the exact Figma page and frames under review, not just the top-level
file URL.

Example:

```md
## Design Source
- Figma link: https://www.figma.com/design/XPKY2feloTzLalTgCON4RO/Dashboard-home--information-hierarchy-and-layout-grid
- Page: Dashboard home
- Frames:
  - Dashboard / Mobile / Returning user
  - Dashboard / Tablet / Returning user
  - Dashboard / Desktop / Returning user
```

### 3. Breakpoints and layout behavior

Designs must include mobile, tablet, and desktop states when the screen is
responsive. Do not assume engineering will infer stacking or wrapping from one
frame.

Document:

- page padding
- max width
- grid or column behavior
- stacking order
- overflow or truncation behavior

Concrete example for dashboard work:

```md
## Spacing and Layout Specs
- Page padding: reuse route padding from `app/dashboard/page.tsx`
- Grid behavior: KPI cards stack 1-up on mobile and 4-up from `md`
- Desktop body: primary/supporting split, with action-driving widgets in the wider column
- Responsive behavior notes: quick actions stack above supporting summaries on mobile
```

### 4. Component states

Every interactive element needs explicit states. Use the same state names used
in repo docs and tests.

Required when applicable:

- Default
- Hover
- Focus
- Active
- Disabled
- Loading
- Error
- Empty
- Success

If a state is intentionally not supported, say that in the handoff.

### 5. Interaction notes

Spell out behavior that cannot be recovered from pixels alone:

- keyboard order
- focus treatment
- hover behavior
- retry behavior after errors
- empty-state CTA behavior
- modal or drawer open/close behavior
- motion or reduced-motion expectations

### 6. Token and styling guidance

Figma values are not implementation instructions by themselves. Handoffs must
say whether a design uses existing project tokens or requires new ones.

Engineers should verify against:

- `tailwind.config.js`
- `app/globals.css`
- `docs/THEMING.md`
- `docs/ELEVATION.md`

Do not hand off raw one-off values without calling out whether they are:

- already represented by an existing token
- intentionally new and reusable
- temporary and awaiting design review

## Real repo example: dashboard handoff

For dashboard changes, the handoff should align to the existing dashboard
entrypoints and docs:

- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `docs/DASHBOARD_LAYOUT_RULES.md`
- `docs/LAYOUT_PATTERNS.md`

A useful dashboard handoff usually answers:

- which widgets are highest priority
- which widgets belong in the primary column vs supporting column
- how mobile stacking changes the reading order
- which loading and empty states must preserve layout stability

Example excerpt:

```md
## Primary User Task
Help returning users understand their current financial position and take the
next highest-priority action without scanning every widget.

## Components Used
- `components/Dashboard/QuickActions.tsx`
- `components/Dashboard/RecentTransactionsWidget.tsx`
- `components/Dashboard/SixMonthTrendsWidget.tsx`

## Responsive behavior notes
- Mobile order: KPI summary -> quick actions -> recent transactions -> trends
- Desktop order: recent transactions and trends stay in the wider primary column
- Supporting summaries move to the narrower secondary column
```

## Handoff checklist before engineering review

A designer should be able to answer yes to all of the following before asking
engineering to implement the spec.

- [ ] Every frame maps to a route under `app/`
- [ ] Frame names identify the feature area and breakpoint
- [ ] Mobile, tablet, and desktop are included where the screen is responsive
- [ ] Interactive states are documented
- [ ] Focus visibility and touch targets are addressed
- [ ] Existing Tailwind tokens are reused where possible
- [ ] Any new token request is called out explicitly
- [ ] Open questions are listed separately from final decisions
- [ ] Known edge cases are included
- [ ] Engineering entrypoints are referenced

This list is intentionally aligned with `docs/DESIGN_QA_CHECKLIST.md`.

## Engineering review workflow

Once a Figma handoff is shared, engineering should review it in this order:

1. confirm the route mapping is real
2. confirm the breakpoints are complete
3. confirm the missing states are resolved
4. confirm token usage matches the existing system
5. identify open product or copy questions before coding
6. map the handoff to stories, tests, and production entrypoints

For reusable component work, continue with
[COMPONENT_LIFECYCLE.md](./COMPONENT_LIFECYCLE.md).

## What should not be in the handoff

A good handoff does **not** rely on:

- only a screenshot without route mapping
- only a top-level Figma file link without frame names
- color, spacing, or radius values copied from Figma without token guidance
- vague notes like "make responsive" without breakpoint behavior
- unresolved interaction questions hidden inside comments on frames

## Related docs

- [DESIGN_HANDOFF_TEMPLATE.md](./DESIGN_HANDOFF_TEMPLATE.md)
- [DESIGN_QA_CHECKLIST.md](./DESIGN_QA_CHECKLIST.md)
- [COMPONENT_LIFECYCLE.md](./COMPONENT_LIFECYCLE.md)
- [DASHBOARD_LAYOUT_RULES.md](./DASHBOARD_LAYOUT_RULES.md)
- [LAYOUT_PATTERNS.md](./LAYOUT_PATTERNS.md)
