import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.['token'] as string | undefined;
    if (!token) throw new UnauthorizedException('Authentication required.');
    try {
      const payload = this.jwt.verify<{ sub: string; email: string; fullName: string; isSuperadmin: boolean }>(token);
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
        isSuperadmin: payload.isSuperadmin,
      };
      (req as Request & { user: AuthenticatedUser }).user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
  }
}
