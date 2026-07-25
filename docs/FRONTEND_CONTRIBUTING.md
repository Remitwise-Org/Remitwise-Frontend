# Frontend Contributor Guide

Welcome to the frontend contributor guide! This document outlines local setup steps, preferred patterns, and best practices for developing the RemitWise frontend.

## Local Setup

To get your local environment running for frontend development, follow these steps:

1. **Install Dependencies**
   Ensure you are using Node.js 18+. Run the following command in the project root:
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy the example environment file and configure it:
   ```bash
   cp .env.example .env.local
   ```
   Ensure you have a `DATABASE_URL` and a valid `SESSION_PASSWORD` (at least 32 characters long).

3. **Database Setup**
   Push the schema to your local SQLite instance:
   ```bash
   npx prisma migrate dev
   ```

4. **Start Development Server**
   Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Pre-Push Checklist

Before submitting a Pull Request, run the following commands locally to ensure CI passes:

```bash
# 1. Check for formatting and linting errors
npm run lint

# 2. Verify type safety and production build
npm run build

# 3. Run all unit tests
npm run test:unit
```

## Preferred Patterns

When writing frontend code, please adhere to these patterns:

### 1. Concrete Component Examples
When adding a new component, avoid abstract generic props like `foo()` or `data`. Use real-world naming reflecting the domain.

**Good:**
```tsx
import { Transaction } from '@/types/transaction';

interface TransactionListProps {
  transactions: Transaction[];
  onRetryRemittance: (transactionId: string) => Promise<void>;
}

export function TransactionList({ transactions, onRetryRemittance }: TransactionListProps) {
  // ...
}
```

### 2. Updating Components
If you change a public component prop in `components/ui/` or a feature component:
- Update the matching Storybook story (if applicable).
- Update the `docs/COMPONENTS.md` entry to reflect the new API.

### 3. Styling and Design Tokens
Respect the design tokens configured in the project. Do **not** hard-code colors, spacing, or radii. Use the Tailwind CSS configuration or established CSS variables.

**Bad:**
```tsx
<div style={{ backgroundColor: '#2b6cb0', padding: '16px', borderRadius: '8px' }}>
  Content
</div>
```

**Good:**
```tsx
<div className="bg-primary p-4 rounded-md">
  Content
</div>
```

### 4. Fetching Data (Client-Side)
When fetching data from the browser, always use our authenticated fetch wrapper if the endpoint requires a session, rather than a raw `fetch()` call.

**Example:**
```ts
import { authFetch } from '@/lib/auth-fetch';

async function fetchRemittance(id: string) {
  const response = await authFetch(`/api/remittance/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch remittance');
  }
  return response.json();
}
```

## Related Documentation

- For architecture details, see [architecture.md](./architecture.md).
- For branching and general PR expectations, see [CONTRIBUTING.md](../CONTRIBUTING.md).
- For operational and support procedures, see [OPERATIONS.md](./OPERATIONS.md).
