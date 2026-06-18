# Issue #297: Dashboard home: information hierarchy and layout grid

**Figma Design Link:** [Dashboard home: information hierarchy and layout grid](https://www.figma.com/design/XPKY2feloTzLalTgCON4RO/Dashboard-home--information-hierarchy-and-layout-grid?node-id=0-1&t=t6JkjuLBwDSQiMHc-1)

## Description
Redesign `app/dashboard/page.tsx` hierarchy: primary KPIs, secondary actions, and content density for first-time vs returning users.

## Requirements and Context
- Deliver Figma (or agreed design tool) frames with mobile, tablet, and desktop breakpoints.
- Target WCAG 2.1 AA for color contrast, focus visibility, and touch targets where applicable.
- Align visual language with existing Tailwind usage; call out new tokens if engineering must extend `tailwind.config.js`.
- Provide annotated handoff: spacing, type styles, component states, and interaction notes (hover, focus, disabled, loading, error).

## Suggested Execution
- Fork or branch the design file; map screens to Next.js routes under `app/` for traceability.
- Audit current UI implementation and note gaps vs desired patterns.
- Produce high-fidelity mocks and a short component/state inventory for engineering.

## Deliverables and Handoff
- Figma link (or attached file) with named pages per feature area.
- Redlines or dev mode specs for critical screens.
- List of open questions for product/engineering (contract limits, copy, edge cases).

## Example Closure Note
`design: handoff approved — Figma link + eng sign-off`

## Guidelines
- Prefer evidence-based layout decisions (scan paths, primary tasks).
- Run a quick design review with engineering before final sign-off.
