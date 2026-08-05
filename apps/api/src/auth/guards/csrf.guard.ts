import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double-submit cookie CSRF check (docs/security/authentication.md → CSRF). Applied globally in
// main.ts to every route except the safe methods; the csrfToken cookie is issued by CsrfCookieGuard.
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const cookieToken = request.cookies?.csrfToken;
    const headerToken = request.headers['x-csrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('Invalid or missing CSRF token.');
    }
    return true;
  }
}
