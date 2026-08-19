import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * Cheap edge-side gate for the platform-admin area.
 *
 * The middleware runs on the Edge runtime, where the Node `jsonwebtoken` crypto is not
 * available, so it can only check that a session cookie is *present*. The authoritative
 * check — signature, expiry and the `isSuperadmin` claim — happens in
 * app/[locale]/superadmin/layout.tsx before any dashboard markup is produced, and again in
 * every /api/superadmin/* route handler. This is defence in depth, not the control itself.
 */
function isSuperadminPath(pathname: string): boolean {
  return pathname === '/superadmin' || pathname.startsWith('/superadmin/');
}

export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isSuperadminPath(pathname) && !req.cookies.get('token')?.value) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(req);
}

export const config = {
  // Run on ALL frontend paths. Exclude only:
  // - Next.js internals (_next, _vercel)
  // - The Next.js API handler (api/)
  // - Backend paths rewritten in next.config.ts (auth/, public/, customer/, reservations/)
  // - Static files (anything with a dot extension)
  // Frontend paths like /salons, /account, /login etc. must NOT be excluded so that
  // next-intl middleware can inject the [locale] segment for the [locale] folder routing.
  matcher: ['/((?!_next|_vercel|api|auth|public|customer|reservations|.*\\..*).*)',],
};
