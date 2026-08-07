import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

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
