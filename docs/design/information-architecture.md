# Information Architecture

## apps/web (public + customer)

```text
/                         salon discovery
/salons/[slug]            salon profile
/salons/[slug]/book       booking flow (service → stylist → date/time → summary → auth → confirm)
/account                  customer profile
/account/reservations     upcoming / pending / completed / cancelled
/login, /register         auth
```

## apps/dashboard (staff)

```text
/                         role-aware landing (redirects to the relevant view)
/superadmin/salons        salon list/detail/create (SUPERADMIN)
/superadmin/audit         audit log (SUPERADMIN)
/salon/profile            salon profile & policy (SALON_ADMIN)
/salon/employees          employees & portfolios (SALON_ADMIN)
/salon/services           services & categories (SALON_ADMIN)
/salon/schedule           schedules/breaks/time-off (SALON_ADMIN)
/salon/reservations        reservation operations (SALON_ADMIN, SALON_MANAGER)
/salon/reports            operational reports (SALON_ADMIN)
```

Route access is a UI convenience only — every route's data is re-authorized server-side (see
`docs/architecture/tenant-isolation.md`); a hidden nav item is never the security control.

## Depth rule

Maximum 3 levels deep from a role's landing page in the MVP; anything deeper gets a dedicated
search/filter entry point instead of more nesting.
