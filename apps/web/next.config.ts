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
  transpilePackages: [
    '@salonomia/api',
    '@salonomia/database',
    '@salonomia/validation',
    '@salonomia/auth',
    '@salonomia/storage',
    '@salonomia/contracts',
  ],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: '/public/:path*',
        destination: '/api/public/:path*',
      },
      {
        source: '/auth/:path*',
        destination: '/api/auth/:path*',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
