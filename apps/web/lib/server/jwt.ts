import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  isSuperadmin: boolean;
}

const SECRET = process.env.SESSION_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret-change-me';
const EXPIRES_IN = '30d';

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export const JWT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60,
  path: '/',
};
