import { test, expect } from '@playwright/test';

const SIGN_IN_API = '**/api/auth/signin';

test.describe('Sign-in form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/sign-in');
  });

  test('renders the sign-in form with labelled fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    // Submit is disabled until the form is valid.
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  test('shows validation errors for an invalid email', async ({ page }) => {
    const email = page.getByLabel('Email');
    await email.fill('not-an-email');
    await email.blur();

    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  test('shows validation errors for a short password', async ({ page }) => {
    const password = page.getByLabel('Password');
    await password.fill('short');
    await password.blur();

    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  test('shows required errors when fields are touched and left empty', async ({ page }) => {
    const email = page.getByLabel('Email');
    await email.focus();
    await email.blur();
    const password = page.getByLabel('Password');
    await password.focus();
    await password.blur();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('enables submit once the form is valid', async ({ page }) => {
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('supersecure1');

    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});

test.describe('Auth redirect behavior (mocked API)', () => {
  test('successful sign-in shows a success toast and redirects to the homepage', async ({
    page,
  }) => {
    // Mock a successful backend response — no API server needed.
    await page.route(SIGN_IN_API, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    );

    await page.goto('/auth/sign-in');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('supersecure1');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Signed in successfully!')).toBeVisible();
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /Where Real-World Effort Meets/i })
    ).toBeVisible();
  });

  test('failed sign-in surfaces the API error message and stays on the page', async ({
    page,
  }) => {
    await page.route(SIGN_IN_API, (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid email or password' }),
      })
    );

    await page.goto('/auth/sign-in');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('wrongpassword1');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('failed sign-in without a message falls back to a generic error', async ({ page }) => {
    await page.route(SIGN_IN_API, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    );

    await page.goto('/auth/sign-in');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('supersecure1');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Sign-in failed. Please try again.')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });
});
