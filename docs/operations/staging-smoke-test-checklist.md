# Staging Smoke-Test Checklist

This checklist defines the manual and automated smoke tests to run against the staging environment after deployment.

> [!WARNING]
> Do not use production credentials, emails, or personal data during smoke testing. Use test domains (e.g. `@example.com` or `@salonomia.test`).

---

## 1. SUPERADMIN Journeys

- [ ] **Login:**
  - Login as the superadmin user on `/login` or `/superadmin/login`.
  - Assert correct redirection to the superadmin dashboard (`/superadmin/salons`).
- [ ] **Create Salon:**
  - Go to `/superadmin/salons/new` or open the creation modal.
  - Fill name, slug, select timezone (e.g. `Asia/Baku`), and save.
  - Verify salon appears in the salon list.
- [ ] **Assign Salon Admin:**
  - On the salon page, invite or assign a `SALON_ADMIN` by entering their email and full name.
  - Verify an invitation token is generated or invitation email is sent (check mail catcher or staging logs).
- [ ] **Manage Subdomain:**
  - Assign or update a custom subdomain or subdomain mapping for the newly created salon.
  - Verify domain format is validated and saved.
- [ ] **Suspend/Restore Salon:**
  - Click "Suspend" on an active salon. Verify status changes to `SUSPENDED` and the salon is no longer accessible by its staff.
  - Click "Restore" and verify status returns to `ACTIVE`.

---

## 2. SALON_ADMIN Journeys

- [ ] **Login:**
  - Access the invite link or login to `/login` with `SALON_ADMIN` credentials.
  - Verify redirected to `/salon/[salonId]/dashboard`.
- [ ] **Edit Salon Profile:**
  - Go to Salon Settings and update allowable fields (e.g., contact phone, description).
  - Assert changes persist after saving.
- [ ] **Create Employee:**
  - Navigate to Employees -> Add Employee.
  - Input full name and initial status as `ACTIVE` or `INACTIVE`.
- [ ] **Create Service:**
  - Go to Services -> Add Service.
  - Enter service name, duration (e.g., 30 min), pricing details, and category.
- [ ] **Assign Service:**
  - Go to Employee profile or Services assignment.
  - Associate the employee with the newly created service.
- [ ] **Create Weekly Schedule:**
  - Go to Employee -> Schedules.
  - Define weekly working hours (e.g. Mon-Fri 09:00 - 18:00) and save.
  - Add a break (e.g., Mon 13:00 - 14:00) and verify it registers.
- [ ] **Invite Manager:**
  - Go to Team/Settings -> Invite Member.
  - Invite a new email as `SALON_MANAGER`.
- [ ] **View Reports:**
  - Navigate to Reports. Verify metrics (total bookings, revenue, top services) load without errors.

---

## 3. SALON_MANAGER Journeys

- [ ] **Login:**
  - Login as the invited `SALON_MANAGER` user.
  - Assert dashboard access is limited strictly to operational views (Reservations).
- [ ] **View Reservations:**
  - Open Reservations view (Today/Day/Week toggle).
  - Verify correct list view and search functionality.
- [ ] **Create Manual Booking:**
  - Click "New Booking" (walk-in).
  - Fill customer details (email + name), choose service, stylist, time, and save.
- [ ] **Confirm Booking:**
  - Select a `PENDING` reservation.
  - Click "Confirm" and check that status transitions to `CONFIRMED`.
- [ ] **Reschedule Booking:**
  - Click "Reschedule" on a reservation.
  - Select new date/time and confirm. Verify updated time slot is locked.
- [ ] **Cancel Booking:**
  - Click "Cancel" and input a reason. Verify status changes to `CANCELLED_BY_SALON`.
- [ ] **Complete Booking:**
  - Mark an in-progress reservation (`CHECKED_IN`) as `COMPLETED`.

---

## 4. CUSTOMER Journeys

- [ ] **Discover Salon:**
  - Access public website (`/`). Search for the created salon slug.
- [ ] **Select Service:**
  - Click the salon, select a service from the list, click "Book".
- [ ] **Choose Stylist Preference:**
  - Select a specific stylist or choose "Any suitable stylist".
- [ ] **Choose Date/Time Slot:**
  - Browse date tabs. Pick a time slot. Verify slots match employee working hours.
- [ ] **Authenticate Without Losing Draft:**
  - Reach Summary page. Click "Log in to confirm" or register a new account.
  - Verify redirections flow back to `/book/confirm` and draft state is still loaded.
- [ ] **Final Book:**
  - Check terms box, click "Confirm Booking". Verify redirection to success page.
- [ ] **View Own Reservation:**
  - Navigate to `/account/reservations` and verify the booking appears.
- [ ] **Reschedule / Cancel when Eligible:**
  - Click details of reservation. Verify reschedule/cancellation actions are available within policy limits (e.g., > 24 hours before appointment).

---

## 5. SECURITY & TENANT ISOLATION

- [ ] **Cross-Role Access Attempt:**
  - Logged-in `CUSTOMER` attempts to request `/superadmin/salons` or `/salons/[salonId]/reports`. Verify a `404` or `403` is returned.
- [ ] **Cross-Tenant Access Attempt:**
  - Logged-in `SALON_ADMIN` of Salon A attempts to fetch `/salons/[salonIdB]/reservations` or edit employees of Salon B. Verify request fails with `404` or `403`.
- [ ] **Resource Hijacking (IDOR):**
  - Customer A attempts to fetch details of a reservation ID belonging to Customer B. Verify request fails with `404`.
- [ ] **Concurrency (Double-Booking Race):**
  - Trigger two browser/API instances simultaneously attempting to reserve the exact same stylist and time slot.
  - Verify exactly one succeeds (`201` created) and the other fails with a `409` conflict.
