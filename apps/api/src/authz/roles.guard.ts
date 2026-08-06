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

    // CUSTOMER-only routes have no :salonId — bind an explicit self-scope to the request so
    // handlers/services never infer salon tenancy from this branch.
    if (requiredRoles.length === 1 && requiredRoles[0] === 'CUSTOMER') {
      request.principalContext = { userId: user.id, scope: 'SELF' };
      return true;
    }

    const salonIdParam = request.params.salonId;
    const salonId = Array.isArray(salonIdParam) ? salonIdParam[0] : salonIdParam;

    // Reject non-UUID salonId before touching the DB — avoids Prisma throwing a 500 on malformed
    // input and prevents information leakage via error message differences.
    if (salonId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salonId)) {
      await this.recordDenied(request, salonId, requiredRoles, 'invalid_salon_id');
      throw new NotFoundException();
    }

    // Platform-level SUPERADMIN routes (e.g. listing all salons) have no :salonId in the path at
    // all — there is no per-salon membership to resolve, so this is the only branch where a bare
    // isSuperadmin check is sufficient. Still denied for anyone else, still audited.
    if (!salonId) {
      if (user.isSuperadmin && requiredRoles.length === 1 && requiredRoles[0] === 'SUPERADMIN') {
        await this.audit.record({
          actorUserId: user.id,
          action: 'superadmin.platform_action',
          targetType: 'Platform',
          targetId: 'platform',
          metadata: { route: request.route?.path, method: request.method },
        });
        return true;
      }
      await this.recordDenied(request, null, requiredRoles, 'missing_platform_role');
      throw new NotFoundException();
    }

    if (user.isSuperadmin && requiredRoles.includes('SUPERADMIN')) {
      const salon = await this.prisma.salon.findUnique({
        where: { id: salonId },
        select: { id: true },
      });
      if (!salon) {
        await this.recordDenied(request, salonId, requiredRoles, 'missing_salon');
        throw new NotFoundException();
      }

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
      include: { salon: { select: { status: true } } },
    });

    // A suspended salon blocks its own staff (SALON_ADMIN/SALON_MANAGER) — only SUPERADMIN (handled
    // above, before this branch) can still act on it, e.g. to restore it (docs/product/
    // acceptance-criteria.md / Section 11.4 suspend-effects).
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      membership.salon.status !== 'ACTIVE' ||
      !requiredRoles.includes(membership.role)
    ) {
      await this.recordDenied(request, salonId, requiredRoles, 'missing_salon_role');
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

  private async recordDenied(
    request: Request,
    salonId: string | null,
    requiredRoles: Role[],
    reason: string,
  ): Promise<void> {
    await this.audit.record({
      actorUserId: request.user?.id ?? null,
      action: 'authz.denied',
      targetType: salonId ? 'Salon' : 'Platform',
      targetId: salonId ?? 'platform',
      salonId,
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? null,
      requestId: request.get('x-request-id') ?? null,
      metadata: {
        route: request.route?.path ?? null,
        method: request.method,
        requiredRoles,
        reason,
      },
    });
  }
}
