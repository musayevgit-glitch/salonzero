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

    await this.prisma.$transaction(async (tx: import('@salonomia/database').Prisma.TransactionClient) => {
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      // SEC-004: invalidate ALL unused reset tokens for this user so an attacker who triggered a
      // parallel reset cannot redeem the other token after the password is changed.
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });

    await this.audit.record({
      actorUserId: record.userId,
      action: 'user.password_reset',
      targetType: 'User',
      targetId: record.userId,
    });
    return true;
  }

  // callerUserId: the currently authenticated session user (if any). Accepting an invitation for
  // an email address that already has an account requires the caller to already be authenticated
  // as that account — we must never establish a session for an existing account without proof of
  // identity. Returns null for invalid/expired tokens; throws ConflictException when the email
  // belongs to an existing account that the caller hasn't authenticated as.
  async acceptInvitation(
    input: AcceptInvitationInput,
    callerUserId?: string,
  ): Promise<AuthenticatedUser | null> {
    const tokenHash = this.tokens.hash(input.token);
    const invitation = await this.prisma.salonInvitation.findUnique({
      where: { tokenHash },
      include: { salon: { select: { status: true } } },
    });

    // SEC-015: also reject if the salon is no longer active — an inactive salon's invitation
    // must not grant membership or establish a session.
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.expiresAt < new Date() ||
      invitation.salon.status !== 'ACTIVE'
    ) {
      return null;
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: invitation.email } });

    if (existingUser) {
      // SEC-001: an existing account must not receive a new authenticated session via invitation
      // acceptance alone — that would be a password-less takeover of the existing account. The
      // caller must already be authenticated as that account (same user id) before we bind the
      // new membership. If they are, we bind the membership and return the existing user; the
      // controller will not call req.login() again since they are already logged in.
      if (!callerUserId || callerUserId !== existingUser.id) {
        throw new ConflictException(
          'This invitation email already has an account. Please log in first, then open the invitation link again.',
        );
      }
      if (existingUser.status !== 'ACTIVE') {
        return null; // treat suspended existing account same as invalid token — no information leak
      }
      await this.prisma.$transaction(async (tx: import('@salonomia/database').Prisma.TransactionClient) => {
        await tx.salonMembership.upsert({
          where: { userId_salonId: { userId: existingUser.id, salonId: invitation.salonId } },
          create: { userId: existingUser.id, salonId: invitation.salonId, role: invitation.role },
          update: { role: invitation.role, status: 'ACTIVE' },
        });
        await tx.salonInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });
      });
      await this.audit.record({
        actorUserId: existingUser.id,
        action: 'membership.invitation_accepted',
        targetType: 'SalonInvitation',
        targetId: invitation.id,
        salonId: invitation.salonId,
      });
      return toAuthenticatedUser(existingUser);
    }

    const newUser = await this.prisma.$transaction(async (tx: import('@salonomia/database').Prisma.TransactionClient) => {
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          fullName: input.fullName ?? invitation.email,
          passwordHash: await this.password.hash(input.password ?? this.tokens.generate().token),
        },
      });
      await tx.salonMembership.create({
        data: { userId: created.id, salonId: invitation.salonId, role: invitation.role },
      });
      await tx.salonInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return created;
    });

    await this.audit.record({
      actorUserId: newUser.id,
      action: 'membership.invitation_accepted',
      targetType: 'SalonInvitation',
      targetId: invitation.id,
      salonId: invitation.salonId,
    });

    return toAuthenticatedUser(newUser);
  }

  async findAuthenticatedUserById(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.status !== 'ACTIVE') return null;
    return toAuthenticatedUser(user);
  }

  async getMySalonMemberships(
    userId: string,
  ): Promise<{ salonId: string; salonName: string; role: string }[]> {
    const memberships = await this.prisma.salonMembership.findMany({
      where: { userId, status: 'ACTIVE', salon: { status: 'ACTIVE' } },
      select: { role: true, salon: { select: { id: true, name: true } } },
    });
    return memberships.map((m) => ({ salonId: m.salon.id, salonName: m.salon.name, role: m.role }));
  }
}
