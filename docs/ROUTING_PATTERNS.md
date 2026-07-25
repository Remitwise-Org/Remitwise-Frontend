# Routing Patterns

This document is intended for **contributors** building features in the RemitWise frontend. It outlines our conventions for route naming, layouts, and nested routes using the Next.js App Router.

## Route Naming

We use `kebab-case` for all route directory names to keep URLs predictable and readable.

**Example:**
- ✅ `app/send-money/page.tsx` becomes `/send-money`
- ❌ `app/sendMoney/page.tsx`
- ❌ `app/send_money/page.tsx`

Dynamic route segments should use clear, descriptive names for the parameter.

**Example:**
- ✅ `app/family/[member-id]/page.tsx`
- ❌ `app/family/[id]/page.tsx`

## Layouts

Layouts (`layout.tsx`) are used to share UI across multiple pages without re-rendering on navigation. 

### Root Layout
The root layout (`app/layout.tsx`) handles document structure, global providers (e.g., Theme, Sentry), and the main navigation shell. Do not add page-specific logic here.

### Feature Layouts
Use nested layouts for feature areas that share common secondary navigation or context. 

**Example (Settings Layout):**
```tsx
// app/settings/layout.tsx
import { SettingsNav } from '@/components/SettingsNav';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <aside className="w-full md:w-64 shrink-0">
        <SettingsNav />
      </aside>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
```

## Nested Routes

Use nested routes to represent hierarchical state or child resources. 

**Example (Family Wallets):**
```text
app/
└── family/
    ├── page.tsx               # /family - Lists all family members
    ├── layout.tsx             # Shared family context/header
    └── [member-id]/
        ├── page.tsx           # /family/user_123 - Member details
        └── limits/
            └── page.tsx       # /family/user_123/limits - Manage limits
```

When building nested routes:
1. **Colocate Components:** Keep route-specific components in a `components` directory next to the route if they are not used elsewhere.
2. **Data Fetching:** Fetch data at the layout level if it's shared by all child routes, or at the page level if it's specific to that view.

## Related Documentation

- [Architecture Overview](architecture.md)
- [Component Lifecycle](COMPONENT_LIFECYCLE.md)
