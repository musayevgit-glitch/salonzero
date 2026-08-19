import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  isSuperadmin: boolean;
}

const DEV_FALLBACK_SECRET = 'dev-secret-change-me';
/** Session lifetime. Every issued token carries a matching `exp` claim. */
const EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60;
/** Pinned so a token cannot be presented with a weaker/none algorithm. */
const ALGORITHM = 'HS256' as const;

/**
 * Resolved per call rather than at module load so a missing secret surfaces as a runtime
 * error on the auth path instead of breaking the build.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET is not configured.');
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: EXPIRES_IN_SECONDS,
    algorithm: ALGORITHM,
  });
}

/** Throws when the token is malformed, signed with another key, or past its `exp`. */
export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] }) as JwtPayload;
}

export const JWT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  // Kept in step with the token's own expiry so the cookie cannot outlive the session.
  maxAge: EXPIRES_IN_SECONDS,
  path: '/',
};
