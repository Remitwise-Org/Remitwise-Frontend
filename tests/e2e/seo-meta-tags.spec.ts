import { test, expect } from '@playwright/test';

const ROUTES: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'RemitWise - Smart Remittance & Financial Planning',
    description:
      'A remittance app that helps families save, plan, and protect — not just send money.',
  },
  '/dashboard': {
    title: 'Dashboard - RemitWise',
    description: 'Manage your smart remittance and financial planning activities',
  },
  '/send': {
    title: 'Send Money - RemitWise',
    description: 'Fast, secure, and low-cost remittance transfers',
  },
  '/split': {
    title: 'Split Transactions - RemitWise',
    description: 'Configure and split your remittances automatically',
  },
  '/transactions': {
    title: 'Transactions - RemitWise',
    description: 'Manage all your transactions and transfers',
  },
  '/family': {
    title: 'Family Wallets - RemitWise',
    description: 'Connect, authorize, and manage wallets for your family members',
  },
  '/settings': {
    title: 'Settings - RemitWise',
    description: 'Update your profile, theme, and language preferences',
  },
  '/emergency-transfer': {
    title: 'Emergency Transfer - RemitWise',
    description:
      'Send instant emergency transfers to your loved ones when they need it most',
  },
  '/tutorial': {
    title: 'Tutorials | RemitWise',
    description:
      'Learn how to use RemitWise with step-by-step tutorials for sending money, managing wallets, savings goals, and more.',
  },
  '/financial-insights': {
    title: 'Financial Insights | RemitWise',
    description:
      'Analyze your spending vs savings, remittance trends, and category breakdowns on RemitWise.',
  },
  '/dashboard/goals': {
    title: 'Savings Goals - RemitWise',
    description:
      'Create and track your savings goals to secure your financial future',
  },
  '/dashboard/insight': {
    title: 'Financial Insights - RemitWise',
    description: 'Detailed analytics of your remittances and savings',
  },
  '/dashboard/transaction-history': {
    title: 'Transaction History - RemitWise',
    description: 'View all your past transaction records and details',
  },
};

for (const [route, expected] of Object.entries(ROUTES)) {
  test(`has expected meta tags on ${route}`, async ({ page }) => {
    await page.goto(route);

    await expect(page).toHaveTitle(expected.title);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', expected.description);
  });
}

test('shows not-found meta tags on non-existent route', async ({ page }) => {
  await page.goto('/this-route-does-not-exist-ever');

  await expect(page).toHaveTitle('Page Not Found – RemitWise');

  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute(
    'content',
    'The page you were looking for could not be found.',
  );
});
