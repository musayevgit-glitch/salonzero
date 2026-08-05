import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '@salonomia/auth';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';
import type { SalonContext } from './salon-context';

/**
 * Resolves the caller's effective role for the salon named in the route and checks it against
 * @Roles(...). Never trusts salonId/role from the request body — only the route's :salonId param
 * (itself just a lookup key; the authorization is the DB membership row it resolves to), or the
 * server-derived session user. See docs/security/authorization.md for the full policy.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<Role[] | undefined>(ROLES_KEY, context.getHandler());

    // No @Roles() at all is a misconfiguration, not an allow-all — fail closed.
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new NotFoundException();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) {
      // AuthenticatedGuard should already have run; treat missing user as denied, not a crash.
      throw new NotFoundException();
    }

    // CUSTOMER-only routes have no :salonId — ownership is checked by the handler's own query
    // (docs/security/authorization.md), not by this guard.
    if (requiredRoles.length === 1 && requiredRoles[0] === 'CUSTOMER') {
      return true;
    }

    const salonIdParam = request.params.salonId;
    const salonId = Array.isArray(salonIdParam) ? salonIdParam[0] : salonIdParam;
    if (!salonId) {
      throw new NotFoundException();
    }

    if (user.isSuperadmin && requiredRoles.includes('SUPERADMIN')) {
      await this.audit.record({
        actorUserId: user.id,
        action: 'superadmin.context_entry',
        targetType: 'Salon',
        targetId: salonId,
        salonId,
        metadata: { route: request.route?.path, method: request.method },
      });
      const salonContext: SalonContext = { salonId, role: 'SUPERADMIN', isSuperadminBypass: true };
      request.salonContext = salonContext;
      return true;
    }

    const membership = await this.prisma.salonMembership.findUnique({
      where: { userId_salonId: { userId: user.id, salonId } },
    });

    if (!membership || membership.status !== 'ACTIVE' || !requiredRoles.includes(membership.role)) {
      throw new NotFoundException();
    }

    const salonContext: SalonContext = {
      salonId,
      role: membership.role,
      isSuperadminBypass: false,
    };
    request.salonContext = salonContext;
    return true;
  }
}
