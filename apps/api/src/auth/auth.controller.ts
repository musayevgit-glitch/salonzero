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
import {
  bindSessionCsrfToken,
  clearCsrfCookie,
  getSessionCsrfToken,
  rotateSessionCsrfToken,
} from '../common/csrf-token';
import { validateAuthThrottleLimit } from '../config/env';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import type { AuthenticatedUser } from './types';

// SEC-006: keep Nest's decorator-friendly module-load constant, but parse through the same env
// schema as startup validation so typos fail closed instead of silently weakening throttling.
const AUTH_THROTTLE = {
  default: {
    limit: validateAuthThrottleLimit(process.env),
    ttl: 60_000,
  },
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(
    @Body() body: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const preRegisterCsrfToken = getSessionCsrfToken(req);
    const user = await this.authService.register(body);
    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => (err ? reject(err) : resolve()));
    });
    if (preRegisterCsrfToken) {
      bindSessionCsrfToken(req, res, preRegisterCsrfToken);
    }
    return user;
  }

  @Throttle(AUTH_THROTTLE)
  @UseGuards(new ZodBodyGuard(loginSchema), AuthGuard('local'))
  @HttpCode(200)
  @Post('login')
  async login(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // AuthGuard('local') only runs LocalStrategy.validate — it does not itself call req.login,
    // so the session cookie is never established without doing it explicitly here too.
    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => (err ? reject(err) : resolve()));
    });
    rotateSessionCsrfToken(req, res);
    return user;
  }

  @UseGuards(AuthenticatedGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser, @Req() req: Request, @Res() res: Response) {
    await this.authService.recordLogout(user.id);
    // SEC-021: `throw` inside an Express callback escapes Nest's exception filter and becomes an
    // uncaughtException — reject the promise instead and let Nest produce a 500 JSON response.
    await new Promise<void>((resolve, reject) =>
      req.logout((err) => (err ? reject(err) : resolve())),
    );
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    res.clearCookie('connect.sid');
    clearCsrfCookie(res);
    return res.status(200).json({ ok: true });
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
  async acceptInvitation(
    @Body() body: AcceptInvitationInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
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
      rotateSessionCsrfToken(req, res);
    }
    return user;
  }
}
