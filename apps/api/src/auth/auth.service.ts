import { ConflictException, Injectable } from '@nestjs/common';
import type { RegisterInput, AcceptInvitationInput } from '@salonomia/validation';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { AuthenticatedUser } from './types';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
// Invitation *creation* (with its own TTL) is a SALON_ADMIN/SUPERADMIN authorization-gated action
// implemented in Phase 6/7, not here — this phase only implements *acceptance* of an existing token.

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  fullName: string;
  isSuperadmin: boolean;
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isSuperadmin: user.isSuperadmin,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async register(input: RegisterInput): Promise<AuthenticatedUser> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      // Registration is the one place a generic response would just harm UX for no real gain — the
      // submitted email is already known to the submitter. Enumeration resistance matters at
      // login/forgot-password (docs/security/authentication.md), not here.
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await this.password.hash(input.password);
    const user = await this.prisma.user.create({
      data: { email: input.email, passwordHash, fullName: input.fullName },
    });

    await this.audit.record({
      actorUserId: user.id,
      action: 'user.registered',
      targetType: 'User',
      targetId: user.id,
    });

    return toAuthenticatedUser(user);
  }

  /** Used by LocalStrategy. Returns null (never throws) on any failure — enumeration resistance. */
  async validateCredentials(
    email: string,
    plainPassword: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || user.status !== 'ACTIVE') {
      await this.audit.record({
        action: 'user.login_failed',
        targetType: 'User',
        targetId: user?.id ?? 'unknown',
      });
      return null;
    }

    const valid = await this.password.verify(user.passwordHash, plainPassword);
    if (!valid) {
      await this.audit.record({
        action: 'user.login_failed',
        targetType: 'User',
        targetId: user.id,
      });
      return null;
    }

    await this.audit.record({
      actorUserId: user.id,
      action: 'user.login_succeeded',
      targetType: 'User',
      targetId: user.id,
    });
    return toAuthenticatedUser(user);
  }

  async recordLogout(userId: string): Promise<void> {
    await this.audit.record({
      actorUserId: userId,
      action: 'user.logout',
      targetType: 'User',
      targetId: userId,
    });
  }

  /** Always succeeds from the caller's perspective regardless of whether the email exists. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || user.status !== 'ACTIVE') return;

    const { tokenHash } = this.tokens.generate();
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
    });
    // Sending the email itself is out of MVP scope (docs/product/out-of-scope.md has no notification
    // provider yet) — the token is created and would be delivered out-of-band once one exists.

    await this.audit.record({
      actorUserId: user.id,
      action: 'user.password_reset_requested',
      targetType: 'User',
      targetId: user.id,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const tokenHash = this.tokens.hash(token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return false;
    }

    const passwordHash = await this.password.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      actorUserId: record.userId,
      action: 'user.password_reset',
      targetType: 'User',
      targetId: record.userId,
    });
    return true;
  }

  async acceptInvitation(input: AcceptInvitationInput): Promise<AuthenticatedUser | null> {
    const tokenHash = this.tokens.hash(input.token);
    const invitation = await this.prisma.salonInvitation.findUnique({ where: { tokenHash } });

    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      return null;
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: invitation.email } });

    const user = await this.prisma.$transaction(async (tx) => {
      const resolvedUser =
        existingUser ??
        (await tx.user.create({
          data: {
            email: invitation.email,
            fullName: input.fullName ?? invitation.email,
            passwordHash: await this.password.hash(input.password ?? this.tokens.generate().token),
          },
        }));

      await tx.salonMembership.create({
        data: { userId: resolvedUser.id, salonId: invitation.salonId, role: invitation.role },
      });
      await tx.salonInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return resolvedUser;
    });

    await this.audit.record({
      actorUserId: user.id,
      action: 'membership.invitation_accepted',
      targetType: 'SalonInvitation',
      targetId: invitation.id,
      salonId: invitation.salonId,
    });

    return toAuthenticatedUser(user);
  }

  async findAuthenticatedUserById(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.status !== 'ACTIVE') return null;
    return toAuthenticatedUser(user);
  }
}
