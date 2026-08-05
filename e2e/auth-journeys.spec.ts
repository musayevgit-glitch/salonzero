import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Authentication journeys against apps/web (Prompt 9.3). Requires apps/api running at
// NEXT_PUBLIC_API_URL (defaults to http://localhost:4000) with a reachable Postgres — not run in
// this environment (Playwright browsers aren't installed here); see docs/implementation/progress.md.

test('customer can register, land on their account, and log out', async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.com`;

  await page.goto('/register');
  await page.getByLabel('Full name').fill('E2E Test User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('longenoughpassword');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('login rejects the wrong password without revealing whether the email exists', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`nonexistent-${randomUUID()}@example.com`);
  await page.getByLabel('Password').fill('whatever123');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByText('Invalid email or password.')).toBeVisible();
});

test('an unauthenticated visit to /account redirects to /login and back after signing in', async ({
  page,
}) => {
  const email = `e2e-return-${randomUUID()}@example.com`;

  // Register first so we have credentials, then simulate a fresh unauthenticated visit.
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Return Path Test');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('longenoughpassword');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole('button', { name: 'Log out' }).click();

  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?returnTo=%2Faccount$/);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('longenoughpassword');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test('forgot-password shows the same generic confirmation for any email', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(`whoever-${randomUUID()}@example.com`);
  await page.getByRole('button', { name: 'Send reset instructions' }).click();

  await expect(page.getByText(/we've sent reset instructions/i)).toBeVisible();
});
