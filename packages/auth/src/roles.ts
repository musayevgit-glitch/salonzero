/**
 * Role names only. No guards/policies yet — implemented in Phase 4 (Authentication and
 * Authorization) per docs/adr/0004-authorization.md. Kept here so downstream packages can
 * reference the type before that phase lands.
 */
export const ROLES = ['SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER', 'CUSTOMER'] as const;

export type Role = (typeof ROLES)[number];
