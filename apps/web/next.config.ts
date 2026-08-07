import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@salonomia/database', '@salonomia/validation', '@salonomia/ui'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  // Rewrites map the paths that client-side JS uses (without /api prefix) to Route Handlers.
  // Server Components call /api/* paths directly (rewrites don't apply to Node fetch).
  async rewrites() {
    return [
      { source: '/public/:path*', destination: '/api/public/:path*' },
      { source: '/auth/:path*', destination: '/api/auth/:path*' },
      { source: '/customer/:path*', destination: '/api/customer/:path*' },
      { source: '/reservations/:path*', destination: '/api/reservations/:path*' },
    ];
  },
};

export default withNextIntl(nextConfig);
