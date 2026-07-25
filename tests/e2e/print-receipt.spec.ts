import { test, expect, type Page } from '@playwright/test';

const MOCK_RECEIPT = {
  id: '00fc7066398a4b42caf1-4424f17589cd755a1509',
  amount: 250,
  currency: 'USDC',
  recipientName: 'Alice',
  recipientAddress: 'GBFAMILY0000000000000000000000000000000000000000000000000',
  senderName: 'Bob',
  senderAddress: 'GCSENDER000000000000000000000000000000000000000000000000',
  date: '2025-06-01T12:00:00Z',
  fee: 0.1,
  status: 'completed'
};

const VIEWPORTS = [
  { label: 'A4', width: 1123, height: 794 },
  { label: 'Letter', width: 1056, height: 816 },
];

async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        transition-delay: 0ms !important;
      }
    `,
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`Print Receipt flow @ ${vp.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
    });

    test(`receipt_print_matches_snapshot_at_${vp.label}`, async ({ page }) => {
      // Goto dashboard then receipt to avoid next.js server fetch errors if any
      await page.goto(`/receipt/${MOCK_RECEIPT.id}`);
      await disableAnimations(page);
      
      // Wait for it to load
      await page.waitForLoadState('networkidle');

      await page.emulateMedia({ media: 'print' });

      // We expect the layout to be clean. We can take a screenshot
      await expect(page).toHaveScreenshot(`print-receipt-${vp.label}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  });
}
