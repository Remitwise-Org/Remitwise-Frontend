# Typography Scale

## Audience

This guide is intended for contributors working on the RemitWise frontend.

## Overview

RemitWise uses Tailwind CSS's default typography utilities rather than a custom typography scale in `tailwind.config.js`. Contributors should reuse the existing utilities to maintain visual consistency across the application.

## Font Sizes

The project commonly uses the following Tailwind font-size utilities:

| Utility | Typical Usage |
|---------|---------------|
| `text-xs` | Badges, labels, helper text, table metadata |
| `text-sm` | Body text, form labels, descriptions |
| `text-base` | Primary body copy |
| `text-lg` | Section headings |
| `text-xl` | Dialog titles |
| `text-2xl` | Page headings |
| `text-3xl` | Statistics and dashboard metrics |
| `text-4xl` | Hero or landing page headings |

## Font Weights

Use semantic weights consistently.

| Utility | Usage |
|---------|-------|
| `font-normal` | Standard body copy |
| `font-medium` | Interactive labels and controls |
| `font-semibold` | Section headings and emphasis |
| `font-bold` | Primary page headings and key metrics |

## Line Heights

Prefer Tailwind's built-in line-height utilities.

| Utility | Typical Usage |
|---------|---------------|
| `leading-5` | Compact supporting text |
| `leading-6` | Standard body copy |
| `leading-7` | Larger headings |
| `leading-relaxed` | Long-form descriptive content |
| `leading-none` | Large numeric values and display text |

## Examples

```tsx
<h1 className="text-2xl font-bold">
  Dashboard
</h1>

<h2 className="text-lg font-semibold">
  Account Summary
</h2>

<p className="text-sm leading-6">
  Review your recent transactions and account activity.
</p>

<span className="text-xs font-medium">
  Pending
</span>
```

## Rationale

- Reuse Tailwind's standard typography utilities instead of introducing one-off values.
- Keep headings, body text, and metadata visually consistent across the application.
- Prefer semantic utility classes over arbitrary font sizes unless there is a documented design requirement.
- When adding new UI, match existing typography before creating new patterns.# Typography Scale

## Audience

This guide is intended for contributors working on the RemitWise frontend.

## Overview

RemitWise uses Tailwind CSS's default typography utilities rather than a custom typography scale in `tailwind.config.js`. Contributors should reuse the existing utilities to maintain visual consistency across the application.

## Font Sizes

The project commonly uses the following Tailwind font-size utilities:

| Utility | Typical Usage |
|---------|---------------|
| `text-xs` | Badges, labels, helper text, table metadata |
| `text-sm` | Body text, form labels, descriptions |
| `text-base` | Primary body copy |
| `text-lg` | Section headings |
| `text-xl` | Dialog titles |
| `text-2xl` | Page headings |
| `text-3xl` | Statistics and dashboard metrics |
| `text-4xl` | Hero or landing page headings |

## Font Weights

Use semantic weights consistently.

| Utility | Usage |
|---------|-------|
| `font-normal` | Standard body copy |
| `font-medium` | Interactive labels and controls |
| `font-semibold` | Section headings and emphasis |
| `font-bold` | Primary page headings and key metrics |

## Line Heights

Prefer Tailwind's built-in line-height utilities.

| Utility | Typical Usage |
|---------|---------------|
| `leading-5` | Compact supporting text |
| `leading-6` | Standard body copy |
| `leading-7` | Larger headings |
| `leading-relaxed` | Long-form descriptive content |
| `leading-none` | Large numeric values and display text |

## Examples

```tsx
<h1 className="text-2xl font-bold">
  Dashboard
</h1>

<h2 className="text-lg font-semibold">
  Account Summary
</h2>

<p className="text-sm leading-6">
  Review your recent transactions and account activity.
</p>

<span className="text-xs font-medium">
  Pending
</span>
```

## Rationale

- Reuse Tailwind's standard typography utilities instead of introducing one-off values.
- Keep headings, body text, and metadata visually consistent across the application.
- Prefer semantic utility classes over arbitrary font sizes unless there is a documented design requirement.
- When adding new UI, match existing typography before creating new patterns.
