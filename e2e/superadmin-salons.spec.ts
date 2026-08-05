import { test, expect } from '@playwright/test';

// Superadmin salon browsing journey (Prompt 11.1) against apps/dashboard. Requires apps/api running
// with a seeded superadmin session — not run in this environment (Playwright browsers aren't
// installed here); see docs/implementation/progress.md.

test('a non-superadmin sees a permission-denied state on the salons list', async ({ page }) => {
  // Assumes a logged-in regular (non-superadmin) staff session via storageState in a real run.
  await page.goto('/superadmin/salons');
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
});

test('superadmin can search, filter by status, and open a salon detail page', async ({ page }) => {
  await page.goto('/superadmin/salons');
  await page.getByPlaceholder('Search by name or slug').fill('Demo');
  await page.getByRole('combobox').selectOption('ACTIVE');
  await page.getByRole('link', { name: /Demo/ }).first().click();
  await expect(page).toHaveURL(/\/superadmin\/salons\/[^/]+$/);
  await expect(page.getByText('Active staff')).toBeVisible();
});
