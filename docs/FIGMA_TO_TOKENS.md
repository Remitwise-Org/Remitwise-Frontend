# Figma to Tailwind Tokens Workflow

This document explains how our design team exports tokens from Figma and how front-end engineers consume them. It is written for **contributors** bridging the gap between design and implementation.

## 1. How Designers Export Tokens

Designers use the [Tokens Studio for Figma](https://tokens.studio/) (or a similar plugin) to maintain a single source of truth for design tokens (colors, typography, spacing, radii, etc.).

When a design milestone is reached, designers export these tokens as a flat JSON file. This file represents our raw primitive and semantic tokens.

### Example Exported Token File (`tokens.json`)
```json
{
  "colors": {
    "brand": {
      "red": {
        "value": "#D72323",
        "type": "color"
      },
      "dark": {
        "value": "#0A0A0A",
        "type": "color"
      }
    }
  },
  "spacing": {
    "space-md": {
      "value": "16px",
      "type": "dimension"
    }
  }
}
```

## 2. How We Consume Tokens

As a frontend engineer, when you receive `tokens.json` from the design team, you must map these values into our `tailwind.config.js` so they become available as utility classes.

### Example: Mapping to `tailwind.config.js`

1. Open `tailwind.config.js`.
2. Locate the relevant section under `theme.extend` (e.g., `colors` or `spacing`).
3. Manually map the token path (e.g., `colors.brand.red`) to the Tailwind config.

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#D72323", // Mapped from colors.brand.red in tokens.json
          dark: "#0A0A0A",
        },
      },
      spacing: {
        "space-md": "16px", // Mapped from spacing.space-md in tokens.json
      }
    }
  }
}
```

## 3. Using Tokens in the App

Once mapped in the Tailwind config, you can use these tokens just like any other Tailwind class. 

For the above example, you would apply them like this:

```tsx
export function PrimaryButton({ children }) {
  return (
    <button className="bg-brand-red text-white p-space-md rounded-md hover:bg-brand-red/80">
      {children}
    </button>
  );
}
```

## Related Documents
- [Design Handoff Guide](./DESIGN_HANDOFF.md)
- [Architecture Overview](./architecture.md)
