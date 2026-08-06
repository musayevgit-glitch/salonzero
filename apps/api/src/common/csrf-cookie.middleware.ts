import type { NextFunction, Request, Response } from 'express';
import { ensureSessionCsrfToken } from './csrf-token';

// Issues a session-bound CSRF cookie (paired with CsrfGuard). Non-httpOnly by design:
// client-side JS must read it to echo it back in a header.
export function csrfCookieMiddleware(req: Request, res: Response, next: NextFunction) {
  ensureSessionCsrfToken(req, res);
  next();
}
