import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  getSessionCsrfToken,
  safeTokenEquals,
} from '../../common/csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Session-bound double-submit CSRF check (docs/security/authentication.md → CSRF). Applied
// globally in main.ts to every route except the safe methods; the csrfToken cookie is issued by
// csrfCookieMiddleware.
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const sessionToken = getSessionCsrfToken(request);
    const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = request.headers[CSRF_HEADER_NAME];

    if (
      !sessionToken ||
      !cookieToken ||
      typeof headerToken !== 'string' ||
      !safeTokenEquals(cookieToken, sessionToken) ||
      !safeTokenEquals(headerToken, sessionToken)
    ) {
      throw new ForbiddenException('Invalid or missing CSRF token.');
    }
    return true;
  }
}
