import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  acceptInvitationSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type AcceptInvitationInput,
  type ForgotPasswordInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@salonomia/validation';
import { ZodBodyGuard } from '../common/zod-body.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import type { AuthenticatedUser } from './types';

// SEC-006: parsed via validateApiEnv at startup; any non-numeric value fails startup rather than
// silently disabling rate limiting. The controller reads from process.env after that gate has
// already run, so the value is guaranteed to coerce to a valid integer.
const AUTH_THROTTLE = {
  default: {
    limit: Math.max(1, Number.isFinite(Number(process.env.AUTH_THROTTLE_LIMIT)) ? Number(process.env.AUTH_THROTTLE_LIMIT) : 10),
    ttl: 60_000,
  },
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() body: RegisterInput, @Req() req: Request) {
    const user = await this.authService.register(body);
    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => (err ? reject(err) : resolve()));
    });
    return user;
  }

  @Throttle(AUTH_THROTTLE)
  @UseGuards(new ZodBodyGuard(loginSchema), AuthGuard('local'))
  @HttpCode(200)
  @Post('login')
  async login(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    // AuthGuard('local') only runs LocalStrategy.validate — it does not itself call req.login,
    // so the session cookie is never established without doing it explicitly here too.
    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => (err ? reject(err) : resolve()));
    });
    return user;
  }

  @UseGuards(AuthenticatedGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser, @Req() req: Request, @Res() res: Response) {
    await this.authService.recordLogout(user.id);
    req.logout((err) => {
      if (err) throw err;
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ ok: true });
      });
    });
  }

  @Get('me')
  me(@Req() req: Request) {
    if (!req.isAuthenticated()) {
      throw new UnauthorizedException();
    }
    return req.user;
  }

  // Lets the dashboard show "which salons can I get to" without a superadmin-only /salons call —
  // scoped to the caller's own memberships, never another user's.
  @Get('my-salons')
  @UseGuards(AuthenticatedGuard)
  mySalons(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMySalonMemberships(user.id);
  }

  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('forgot-password')
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  async forgotPassword(@Body() body: ForgotPasswordInput) {
    await this.authService.forgotPassword(body.email);
    // Always the same response — enumeration resistance (docs/security/authentication.md).
    return { message: "If an account exists for that email, we've sent reset instructions." };
  }

  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() body: ResetPasswordInput) {
    const ok = await this.authService.resetPassword(body.token, body.password);
    if (!ok) {
      throw new UnauthorizedException('This reset link is invalid or has expired.');
    }
    return { ok: true };
  }

  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('invitations/accept')
  @UsePipes(new ZodValidationPipe(acceptInvitationSchema))
  async acceptInvitation(@Body() body: AcceptInvitationInput, @Req() req: Request) {
    const callerUserId = (req.user as { id?: string } | undefined)?.id;
    const user = await this.authService.acceptInvitation(body, callerUserId);
    if (!user) {
      throw new UnauthorizedException('This invitation is invalid or has expired.');
    }
    // Only establish a new session if the caller was not already authenticated as this user.
    // When callerUserId === user.id, the session already exists — calling req.login again would
    // regenerate the session unnecessarily and risk losing in-flight state.
    if (!callerUserId || callerUserId !== user.id) {
      await new Promise<void>((resolve, reject) => {
        req.login(user, (err) => (err ? reject(err) : resolve()));
      });
    }
    return user;
  }
}
