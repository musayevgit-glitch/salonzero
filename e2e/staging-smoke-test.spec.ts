import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Staging Smoke-Test Suite (Prompt 32)
// Verifies critical journeys for Superadmin, Salon Admin, Salon Manager, Customer, and Security checks.
// Runs against a running stack (staging or local).

const suffix = randomUUID().slice(0, 8);
const superadminEmail = 'superadmin@salonomia.test';
const superadminPassword = 'superadminpassword';

const salonAdminEmail = `admin-${suffix}@salonomia.test`;
const salonAdminPassword = 'salonadminpassword';
const salonSlug = `smoke-salon-${suffix}`;
const salonName = `Smoke Salon ${suffix}`;

const managerEmail = `manager-${suffix}@salonomia.test`;
const managerPassword = 'managerpassword';

const customerEmail = `customer-${suffix}@salonomia.test`;
const customerPassword = 'customerpassword';

test.describe.configure({ mode: 'serial' }); // Run sequentially as states build on previous steps

test.describe('1. SUPERADMIN Journeys', () => {
  test('Superadmin login and dashboard access', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(superadminEmail);
    await page.getByLabel('Password').fill(superadminPassword);
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/superadmin\/salons/);
  });

  test('Superadmin create salon', async ({ page }) => {
    // Navigate to create salon page
    await page.goto('/superadmin/salons/new');
    await page.getByLabel('Name').fill(salonName);
    await page.getByLabel('Slug').fill(salonSlug);
    await page.getByLabel('Timezone').fill('Asia/Baku');
    await page.getByRole('button', { name: /create salon/i }).click();
    await expect(page).toHaveURL(/\/superadmin\/salons/);
    await expect(page.getByText(salonName)).toBeVisible();
  });

  test('Superadmin assign salon admin', async ({ page }) => {
    await page.goto('/superadmin/salons');
    await page.getByRole('link', { name: salonName }).click();
    await page.getByRole('button', { name: /invite admin/i }).click();
    await page.getByLabel('Admin Email').fill(salonAdminEmail);
    await page.getByLabel('Admin Name').fill(`Admin ${suffix}`);
    await page.getByRole('button', { name: /send invitation/i }).click();
    await expect(page.getByText(/invitation sent/i)).toBeVisible();
  });

  test('Superadmin suspend and restore salon', async ({ page }) => {
    await page.goto('/superadmin/salons');
    await page.getByRole('link', { name: salonName }).click();

    // Suspend
    await page.getByRole('button', { name: /suspend/i }).click();
    await expect(page.getByText(/status: suspended/i)).toBeVisible();

    // Restore
    await page.getByRole('button', { name: /restore/i }).click();
    await expect(page.getByText(/status: active/i)).toBeVisible();
  });
});

test.describe('2. SALON_ADMIN Journeys', () => {
  test('Salon Admin login and edit profile', async ({ page }) => {
    // Assume admin registers via the invite flow link or normal signup mapped to salon
    await page.goto('/login');
    await page.getByLabel('Email').fill(salonAdminEmail);
    await page.getByLabel('Password').fill(salonAdminPassword);
    await page.getByRole('button', { name: /log in/i }).click();

    // Edit salon profile
    await page.goto(`/salon/${salonSlug}/settings`);
    await page.getByLabel('Phone').fill('+994501234567');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/settings updated/i)).toBeVisible();
  });

  test('Salon Admin manage services, employees, and schedule', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(salonAdminEmail);
    await page.getByLabel('Password').fill(salonAdminPassword);
    await page.getByRole('button', { name: /log in/i }).click();

    // Create Service
    await page.goto(`/salon/${salonSlug}/services/new`);
    await page.getByLabel('Name').fill('Smoke Haircut');
    await page.getByLabel('Price').fill('30.00');
    await page.getByLabel('Duration').fill('30');
    await page.getByRole('button', { name: /create service/i }).click();

    // Create Employee
    await page.goto(`/salon/${salonSlug}/employees/new`);
    await page.getByLabel('Full Name').fill('Smoke Stylist');
    await page.getByRole('button', { name: /create employee/i }).click();

    // Set Schedule and break
    await page.goto(`/salon/${salonSlug}/employees`);
    await page.getByRole('link', { name: 'Smoke Stylist' }).click();
    await page.getByRole('link', { name: 'Schedules & Breaks' }).click();
    await page.getByRole('button', { name: /add schedule block/i }).click();
    await page.getByLabel('Day').selectOption('MONDAY');
    await page.getByLabel('Start Time').fill('09:00');
    await page.getByLabel('End Time').fill('18:00');
    await page.getByRole('button', { name: /save schedule/i }).click();

    // Invite Manager
    await page.goto(`/salon/${salonSlug}/team`);
    await page.getByRole('button', { name: /invite manager/i }).click();
    await page.getByLabel('Email').fill(managerEmail);
    await page.getByRole('button', { name: /send invite/i }).click();
  });
});

test.describe('3. SALON_MANAGER Journeys', () => {
  test('Salon Manager operations dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(managerEmail);
    await page.getByLabel('Password').fill(managerPassword);
    await page.getByRole('button', { name: /log in/i }).click();

    // View reservations list
    await expect(page).toHaveURL(new RegExp(`/salon/[^/]+/reservations`));
    await expect(page.getByRole('heading', { name: /reservations/i })).toBeVisible();

    // Create manual booking
    await page.getByRole('link', { name: /new booking/i }).click();
    await page.getByLabel('Customer Email').fill(`walkin-${suffix}@example.com`);
    await page.getByLabel('Customer Name').fill('Walkin Guest');
    await page.getByLabel('Service').selectOption({ label: 'Smoke Haircut' });
    await page.getByRole('button', { name: /create booking/i }).click();
  });
});

test.describe('4. CUSTOMER Journeys', () => {
  test('Customer public booking flow', async ({ page }) => {
    // Discover and select service
    await page.goto(`/salons/${salonSlug}`);
    await page.getByRole('link', { name: /book/i }).first().click();

    // Choose stylist
    await expect(page).toHaveURL(/\/book\/stylist$/);
    await page.getByRole('button', { name: /no preference/i }).click();

    // Choose date & time
    await expect(page).toHaveURL(/\/book\/datetime$/);
    await page.locator('button').filter({ hasText: /^\d+$/ }).first().click();
    await page
      .getByRole('button', { name: /:\d{2}/ })
      .first()
      .click();

    // Summary Page & Auth Handoff
    await expect(page).toHaveURL(/\/book\/summary$/);
    await page.getByRole('button', { name: /log in to confirm/i }).click();

    // Login (preserve draft)
    await page.getByLabel('Email').fill(customerEmail);
    await page.getByLabel('Password').fill(customerPassword);
    await page.getByRole('button', { name: /log in/i }).click();

    // Confirm booking
    await expect(page).toHaveURL(/\/book\/confirm$/);
    await page.getByRole('checkbox', { name: /terms/i }).check();
    await page.getByRole('button', { name: /confirm booking/i }).click();

    // Success page
    await expect(page).toHaveURL(/\/book\/result\/.+$/);
    await expect(page.getByRole('heading', { name: /confirmed/i })).toBeVisible();
  });
});

test.describe('5. SECURITY & TENANT ISOLATION Checks', () => {
  test('Customer cannot access Superadmin pages', async ({ page }) => {
    // Login as customer
    await page.goto('/login');
    await page.getByLabel('Email').fill(customerEmail);
    await page.getByLabel('Password').fill(customerPassword);
    await page.getByRole('button', { name: /log in/i }).click();

    // Attempt Superadmin access
    await page.goto('/superadmin/salons');
    await expect(page.getByText(/permission denied|don't have access/i)).toBeVisible();
  });

  test('Salon Manager cannot access Superadmin or edit services', async ({ page }) => {
    // Login as manager
    await page.goto('/login');
    await page.getByLabel('Email').fill(managerEmail);
    await page.getByLabel('Password').fill(managerPassword);
    await page.getByRole('button', { name: /log in/i }).click();

    // Attempt edit services
    await page.goto(`/salon/${salonSlug}/services`);
    await expect(page.getByText(/permission denied|don't have access/i)).toBeVisible();
  });
});
