# Elevation and shadow guidance

Audience: contributors building cards, drawers, modals, or any surface that needs visual separation.

Elevation is the layer that makes one surface feel "closer" or "higher" than another. Use it to communicate hierarchy, not decoration. A good rule of thumb is to use the lowest elevation that still makes the grouping clear.

## Core principles

- Prefer the lightest elevation that still communicates separation.
- Pair elevation with a subtle border or surface change when a panel needs to feel distinct from the page background.
- Keep shadow direction consistent: use a soft, downward shadow for resting surfaces and a stronger, wider shadow for overlays and modals.
- Avoid adding multiple shadow layers to the same element unless the component is intentionally floating over a dense interface.
- Reuse the same elevation scale across cards, dialogs, menus, and sheets so the UI feels predictable.

## Recommended elevation levels

| Level | Use when | Recommended treatment | Example usage |
| --- | --- | --- | --- |
| 0 | The surface is flat and should feel part of the page background. | No shadow, subtle border only if needed. | Table rows, inline panels, status chips. |
| 1 | The surface is a standard card or secondary panel. | Soft shadow plus a subtle border. | Dashboard stat cards, feature tiles, compact forms. |
| 2 | The surface needs to float above nearby content. | Medium shadow, slightly stronger blur, more defined contrast. | Dropdowns, sticky panels, section containers, detail drawers. |
| 3 | The surface is temporarily over the entire interface. | Strong shadow and a clear overlay relationship. | Modal windows, full-screen sheets, onboarding dialogs, high-emphasis callouts. |

## Suggested token names

These names are intended as a documentation contract for contributors and designers. If the team later adds them to Tailwind or CSS variables, keep the same semantic meaning.

| Token | Example value | Use for |
| --- | --- | --- |
| `elevation-0` | `none` | Flat surfaces |
| `elevation-1` | `0 4px 16px rgba(0, 0, 0, 0.12)` | Standard cards |
| `elevation-2` | `0 12px 30px rgba(0, 0, 0, 0.16)` | Floating panels and drawers |
| `elevation-3` | `0 24px 60px rgba(0, 0, 0, 0.24)` | Overlays and modals |

## Practical examples

### Level 1 card

Use this for a normal dashboard or settings card:

```tsx
<div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
  {/* card content */}
</div>
```

### Level 2 panel

Use this when the component should feel detached from the page and read as a focused workspace:

```tsx
<div className="rounded-3xl border border-white/10 bg-[#121212] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.16)]">
  {/* high-priority panel */}
</div>
```

### Level 3 modal

Use this for temporary overlays that need to command attention:

```tsx
<div className="rounded-[2rem] border border-white/10 bg-[#0c0c0c] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
  {/* modal content */}
</div>
```

## Accent shadows

Some surfaces need stronger emphasis than the base elevation scale provides. If the intent is to draw attention to a primary action or an urgent state, use a brand-accent glow rather than inflating the base shadow.

Example:

```tsx
<div className="shadow-[0_0_24px_rgba(215,35,35,0.24)]">
  {/* urgent or high-priority action */}
</div>
```

Use this sparingly: accent shadows should reinforce a single focal point, not replace a normal surface hierarchy.

## Decision checklist

Before choosing an elevation level, ask:

1. Is this surface part of the page or a separate layer?
2. Does it need to feel interactive or temporary?
3. Is it close to a primary action or modal flow?
4. Could a lighter elevation achieve the same hierarchy?

If the answer is “no” to the last question, reduce the elevation level.
