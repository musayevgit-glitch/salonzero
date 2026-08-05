import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const COOKIE_NAME = 'csrfToken';

// Issues the double-submit CSRF cookie (paired with CsrfGuard) if the client doesn't already have
// one. Non-httpOnly by design: client-side JS must be able to read it to echo it back in a header.
export function csrfCookieMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.[COOKIE_NAME]) {
    const token = randomBytes(32).toString('base64url');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    req.cookies = { ...req.cookies, [COOKIE_NAME]: token };
  }
  next();
}
