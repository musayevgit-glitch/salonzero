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
import { JwtService } from '@nestjs/jwt';
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
import { validateAuthThrottleLimit } from '../config/env';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './types';

const AUTH_THROTTLE = {
  default: {
    limit: validateAuthThrottleLimit(process.env),
    ttl: 60_000,
  },
};

const COOKIE_OPTIONS = (isProduction: boolean) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProduction,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  private issueToken(user: AuthenticatedUser, res: Response): void {
    const isProduction = process.env['NODE_ENV'] === 'production';
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      isSuperadmin: user.isSuperadmin,
    });
    res.cookie('token', token, COOKIE_OPTIONS(isProduction));
  }

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(
    @Body() body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.register(body);
    this.issueToken(user, res);
    return user;
  }

  @Throttle(AUTH_THROTTLE)
  @UseGuards(new ZodBodyGuard(loginSchema), AuthGuard('local'))
  @HttpCode(200)
  @Post('login')
  async login(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.issueToken(user, res);
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    await this.authService.recordLogout(user.id);
    res.clearCookie('token', { path: '/' });
    return res.status(200).json({ ok: true });
  }

  @Get('me')
  me(@Req() req: Request) {
    const token = req.cookies?.['token'] as string | undefined;
    if (!token) throw new UnauthorizedException();
    try {
      const payload = this.jwtService.verify<{
        sub: string; email: string; fullName: string; isSuperadmin: boolean;
      }>(token);
      return { id: payload.sub, email: payload.email, fullName: payload.fullName, isSuperadmin: payload.isSuperadmin };
    } catch {
      throw new UnauthorizedException();
    }
  }

  @Get('my-salons')
  @UseGuards(JwtAuthGuard)
  mySalons(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMySalonMemberships(user.id);
  }

  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('forgot-password')
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  async forgotPassword(@Body() body: ForgotPasswordInput) {
    await this.authService.forgotPassword(body.email);
    return { message: "If an account exists for that email, we've sent reset instructions." };
  }

  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() body: ResetPasswordInput) {
    const ok = await this.authService.resetPassword(body.token, body.password);
    if (!ok) throw new UnauthorizedException('This reset link is invalid or has expired.');
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
    const callerUserId = (req.user as AuthenticatedUser | undefined)?.id;
    const user = await this.authService.acceptInvitation(body, callerUserId);
    if (!user) throw new UnauthorizedException('This invitation is invalid or has expired.');
    this.issueToken(user, res);
    return user;
  }
}
