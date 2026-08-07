import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match root and all paths, except Next.js internals and backend API routes.
    '/((?!_next|_vercel|api|public|auth|uploads|customer|reservations|salons|superadmin|.*\\..*).*)',
  ],
};
