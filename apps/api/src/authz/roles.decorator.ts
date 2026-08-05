import { SetMetadata } from '@nestjs/common';
import type { Role } from '@salonomia/auth';

export const ROLES_KEY = 'roles';

/**
 * Declares which roles may call this route. Absence of this decorator means RolesGuard denies by
 * default (docs/security/authorization.md) — it is not an opt-in allow-list applied only when used.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
