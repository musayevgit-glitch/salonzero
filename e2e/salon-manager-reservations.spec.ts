import { test, expect } from '@playwright/test';

// SALON_MANAGER reservation operations journey (Prompt 16.1) against apps/dashboard. Requires
// apps/api running with a seeded SALON_MANAGER session — not run in this environment (Playwright
// browsers aren't installed here); see docs/implementation/progress.md. Runs under both the
// "mobile" (375px-equivalent) and "desktop" (1440px) projects defined in playwright.config.ts.

test("manager sees today's reservations with contextual quick actions", async ({ page }) => {
  // Assumes a logged-in SALON_MANAGER session via storageState in a real run.
  await page.goto('/salon/DEMO_SALON_ID/reservations');
  await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
});

test('manager confirms a pending reservation from the list without leaving the page', async ({
  page,
}) => {
  await page.goto('/salon/DEMO_SALON_ID/reservations');
  await page.getByRole('button', { name: 'Confirm' }).first().click();
  await expect(page.getByText('Confirmed').first()).toBeVisible();
});

test('manager opens a reservation, reschedules it, and later checks it in', async ({ page }) => {
  await page.goto('/salon/DEMO_SALON_ID/reservations');
  await page
    .getByRole('link', { name: /\d{1,2}:\d{2}/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Reschedule' }).click();
  await page.getByLabel('New start time').fill('2026-08-10T16:00');
  await page.getByRole('button', { name: 'Save new time' }).click();
  await expect(page.getByText('Reservation updated.')).toBeVisible();

  await page.getByRole('button', { name: 'Check in' }).click();
  await expect(page.getByText('Checked in')).toBeVisible();
});

test('manager creates a manual reservation for a walk-in customer', async ({ page }) => {
  await page.goto('/salon/DEMO_SALON_ID/reservations/new');
  await page.getByLabel('Customer email').fill('walkin@example.com');
  await page.getByLabel('Customer full name').fill('Walk In');
  await page.getByLabel('Service').selectOption({ index: 1 });
  await page.getByLabel('Start time').fill('2026-08-11T10:00');
  await page.getByRole('button', { name: 'Create reservation' }).click();
  await expect(page).toHaveURL(/\/salon\/[^/]+\/reservations\/[^/]+$/);
});

test('a plain authenticated user (no membership) sees a permission-denied state', async ({
  page,
}) => {
  await page.goto('/salon/DEMO_SALON_ID/reservations');
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
});
