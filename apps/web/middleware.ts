import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Only run on frontend page routes — skip all API, static assets, and backend paths.
  matcher: ['/((?!_next|_vercel|api|public|auth|uploads|customer|reservations|salons|superadmin|.*\\..*).*)',],
};
