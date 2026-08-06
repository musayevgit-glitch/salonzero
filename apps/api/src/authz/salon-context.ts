import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SalonRole } from '@salonomia/database';

/**
 * Attached to `request` by RolesGuard once a salon-scoped route passes its checks — the *only*
 * place a handler should read the authorized salonId/role from (never request.params directly,
 * even though params.salonId is what the guard used to look it up — reading it again here would
 * bypass the guard's verification for handlers that forget to re-check).
 */
export interface SalonContext {
  salonId: string;
  role: SalonRole | 'SUPERADMIN';
  isSuperadminBypass: boolean;
}

export interface PrincipalContext {
  userId: string;
  scope: 'SELF';
}

declare module 'express' {
  interface Request {
    salonContext?: SalonContext;
    principalContext?: PrincipalContext;
  }
}

export const CurrentSalonContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.salonContext;
  },
);
