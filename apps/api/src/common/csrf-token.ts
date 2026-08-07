import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Session } from 'express-session';

export const CSRF_COOKIE_NAME = 'csrfToken';
export const LEGACY_CSRF_COOKIE_NAME = 'csrfToken';
export const CSRF_HEADER_NAME = 'x-csrf-token';

type SessionWithCsrf = Session & {
  csrfToken?: string;
};

export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

export function getSessionCsrfToken(req: Request): string | undefined {
  return (req.session as SessionWithCsrf | undefined)?.csrfToken;
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export function ensureSessionCsrfToken(req: Request, res: Response): string | undefined {
  if (!req.session) return undefined;

  const session = req.session as SessionWithCsrf;
  session.csrfToken ??= generateCsrfToken();
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    setCsrfCookie(res, session.csrfToken);
    req.cookies = { ...req.cookies, [CSRF_COOKIE_NAME]: session.csrfToken };
  }
  return session.csrfToken;
}

export function rotateSessionCsrfToken(req: Request, res: Response): string | undefined {
  if (!req.session) return undefined;

  const token = generateCsrfToken();
  (req.session as SessionWithCsrf).csrfToken = token;
  setCsrfCookie(res, token);
  req.cookies = { ...req.cookies, [CSRF_COOKIE_NAME]: token };
  return token;
}

export function bindSessionCsrfToken(
  req: Request,
  res: Response,
  token: string,
): string | undefined {
  if (!req.session) return undefined;

  (req.session as SessionWithCsrf).csrfToken = token;
  setCsrfCookie(res, token);
  req.cookies = { ...req.cookies, [CSRF_COOKIE_NAME]: token };
  return token;
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
  if (CSRF_COOKIE_NAME !== LEGACY_CSRF_COOKIE_NAME) {
    res.clearCookie(LEGACY_CSRF_COOKIE_NAME, { path: '/' });
  }
}

export function safeTokenEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
