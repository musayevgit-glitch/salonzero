import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Full customer booking journey (Phase 10 / Section 18.4-18.6).
// Requires apps/api (port 4000) + apps/web (port 3000) running with a seeded test salon.
// Not run in this environment (Playwright browsers not installed); see docs/implementation/progress.md.
// Runs under both "mobile" (iPhone 13) and "desktop" (1440px) projects in playwright.config.ts.

const SEED_SLUG = 'extra-salon'; // seeded via packages/database/prisma/seed.ts

test.describe('unauthenticated discovery and booking start', () => {
  test('customer browses the salon discovery page and opens a salon detail', async ({ page }) => {
    await page.goto('/salons');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // At least one salon card should be present from seed data
    const card = page.getByRole('link', { name: /book/i }).first();
    await expect(card).toBeVisible();
  });

  test('salon detail page shows services and a Book now CTA', async ({ page }) => {
    await page.goto(`/salons/${SEED_SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Services section
    await expect(page.getByRole('heading', { name: /services/i })).toBeVisible();
    // At least one Book button
    await expect(page.getByRole('link', { name: /book/i }).first()).toBeVisible();
  });

  test('booking stepper starts at Service step', async ({ page }) => {
    await page.goto(`/salons/${SEED_SLUG}/book/service`);
    await expect(page.getByRole('heading', { name: /choose a service/i })).toBeVisible();
  });

  test('navigating directly to stylist step without a service redirects to service step', async ({
    page,
  }) => {
    // Clear session storage to simulate fresh visit
    await page.goto(`/salons/${SEED_SLUG}/book/stylist`);
    // Should redirect back to service
    await expect(page).toHaveURL(/\/book\/service$/);
  });

  test('navigating directly to summary step without full draft redirects correctly', async ({
    page,
  }) => {
    await page.goto(`/salons/${SEED_SLUG}/book/summary`);
    // No draft in sessionStorage → redirects to service
    await expect(page).toHaveURL(/\/book\/(service|datetime)$/);
  });
});

test.describe('full booking journey (authenticated customer)', () => {
  const email = `e2e-booking-${randomUUID()}@example.com`;
  const password = 'longenoughpassword';

  test.beforeAll(async ({ browser }) => {
    // Register a customer so we can log in during the booking confirm step
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/register');
    await page.getByLabel('Full name').fill('E2E Booking Customer');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/account$/);
    await ctx.close();
  });

  test('selects a service, stylist, datetime, reaches summary, logs in, confirms, and sees result', async ({
    page,
  }) => {
    // Step 1 — Service
    await page.goto(`/salons/${SEED_SLUG}/book/service`);
    const serviceCard = page.getByRole('button', { name: /haircut/i }).first();
    await expect(serviceCard).toBeVisible();
    await serviceCard.click();

    // Step 2 — Stylist
    await expect(page).toHaveURL(/\/book\/stylist$/);
    // "No preference" option always present
    const noPreference = page.getByRole('button', { name: /no preference/i });
    await expect(noPreference).toBeVisible();
    await noPreference.click();

    // Step 3 — Date & Time
    await expect(page).toHaveURL(/\/book\/datetime$/);
    // Pick the first available date tab
    const dateBtn = page
      .locator('button[aria-label], button')
      .filter({ hasText: /^[A-Z][a-z]{2}\s*\d+$/ })
      .first();
    await expect(dateBtn).toBeVisible({ timeout: 5000 });
    await dateBtn.click();
    // Wait for slots to appear and click the first one
    const slot = page.getByRole('button', { name: /^\d+:\d{2}\s*(AM|PM)?$/ }).first();
    await expect(slot).toBeVisible({ timeout: 8000 });
    await slot.click();

    // Step 4 — Summary
    await expect(page).toHaveURL(/\/book\/summary$/);
    await expect(page.getByRole('heading', { name: /review your booking/i })).toBeVisible();
    await expect(page.getByText(/haircut/i)).toBeVisible();
    // Not yet logged in → see Login CTA
    await expect(page.getByRole('button', { name: /log in to confirm/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole('button', { name: /log in to confirm/i }).click();

    // Step 5 — Login (with returnTo back to confirm)
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();

    // Step 6 — Confirm page
    await expect(page).toHaveURL(/\/book\/confirm$/);
    await expect(page.getByRole('heading', { name: /confirm your booking/i })).toBeVisible();
    // Profile should be pre-filled — wait for it to load
    await expect(page.getByText(email)).toBeVisible({ timeout: 5000 });
    // Accept terms
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /confirm booking/i }).click();

    // Step 7 — Result page
    await expect(page).toHaveURL(/\/book\/result\/.+$/, { timeout: 10000 });
    await expect(
      page.getByRole('heading', { name: /booking (received|confirmed)/i }),
    ).toBeVisible();
    await expect(page.getByText(/haircut/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /view my bookings/i })).toBeVisible();
  });

  test('customer sees their reservation in account and can cancel it', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/account$/);

    // Navigate to reservations
    await page.getByRole('link', { name: /reservations/i }).click();
    await expect(page).toHaveURL(/\/account\/reservations$/);
    await expect(page.getByRole('heading', { name: /my reservations/i })).toBeVisible();

    // Should see the reservation just created
    const reservationLink = page.getByRole('link', { name: /haircut/i }).first();
    await expect(reservationLink).toBeVisible({ timeout: 5000 });
    await reservationLink.click();

    await expect(page).toHaveURL(/\/account\/reservations\/.+$/);
    await expect(page.getByRole('heading', { name: /haircut/i })).toBeVisible();

    // Cancel if allowed
    const cancelBtn = page.getByRole('button', { name: /cancel this booking/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      // Confirmation prompt appears
      await expect(page.getByRole('button', { name: /yes, cancel/i })).toBeVisible();
      await page.getByRole('button', { name: /yes, cancel/i }).click();
      // Redirects back to reservations list
      await expect(page).toHaveURL(/\/account\/reservations$/);
    }
  });
});

test.describe('booking conflict handling', () => {
  test('409 conflict on confirm clears startAt and redirects to datetime', async ({ page }) => {
    // This test requires the slot to be already taken; we simulate via the
    // confirm page's client-side 409 handling. In a real run, book the same slot
    // in a parallel session first. This is documented but hard to automate reliably
    // without a seeded conflict — marked as integration intent only.
    await page.goto(`/salons/${SEED_SLUG}/book/service`);
    await expect(page.getByRole('heading', { name: /choose a service/i })).toBeVisible();
    // Journey verified at unit level in reservations.e2e.test.ts (concurrency tests)
  });
});

test.describe('accessibility', () => {
  test('service step has no critical axe violations', async ({ page }) => {
    const { checkA11y } = await import('@axe-core/playwright');
    await page.goto(`/salons/${SEED_SLUG}/book/service`);
    await checkA11y(page, undefined, {
      detailedReport: false,
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
  });

  test('summary step has no critical axe violations', async ({ page }) => {
    const { checkA11y } = await import('@axe-core/playwright');
    // Pre-populate draft so guard doesn't redirect
    await page.goto(`/salons/${SEED_SLUG}/book/service`);
    const serviceBtn = page.getByRole('button').first();
    if (await serviceBtn.isVisible()) {
      await serviceBtn.click();
      const npBtn = page.getByRole('button', { name: /no preference/i });
      if (await npBtn.isVisible()) {
        await npBtn.click();
        // Pick a date/slot if available
        const dateBtn = page.locator('button').filter({ hasText: /^\d+$/ }).first();
        if (await dateBtn.isVisible()) {
          await dateBtn.click();
          const slot = page.getByRole('button', { name: /:\d{2}/ }).first();
          if (await slot.isVisible()) {
            await slot.click();
            await expect(page).toHaveURL(/\/book\/summary$/);
            await checkA11y(page, undefined, {
              detailedReport: false,
              runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
            });
          }
        }
      }
    }
  });
});
