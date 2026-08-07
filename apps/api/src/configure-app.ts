import type { INestApplication } from '@nestjs/common';
import connectPgSimple from 'connect-pg-simple';
import { NoStoreInterceptor } from './common/no-store.interceptor';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import { Pool } from 'pg';
import type { ApiEnv } from './config/env';

// Shared between main.ts (real server) and integration tests, so tests exercise the exact same
// session/CSRF/CORS wiring production uses rather than a simplified stand-in.
export function configureApp(app: INestApplication, env: ApiEnv): void {
  const isProduction = env.NODE_ENV === 'production';

  // SEC-005: trust exactly the configured number of proxy hops. This makes req.ip resolve to the
  // real client IP (fixing per-IP rate limiting) and allows express-session's `secure: true` to
  // detect HTTPS correctly behind a TLS-terminating LB. Never pass `true` — that accepts any
  // X-Forwarded-For value the client sends, which an attacker can spoof.
  const httpAdapter = app.getHttpAdapter().getInstance() as import('express').Application;
  if (isProduction || env.TRUST_PROXY_HOPS > 0) {
    httpAdapter.set('trust proxy', env.TRUST_PROXY_HOPS || 1);
  }

  // Helmet must come first so security headers are present on every response, including errors.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow browser-fetched assets
      contentSecurityPolicy: isProduction, // dev keeps it off so HMR websockets work
    }),
  );

  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  app.use(cookieParser());

  const PgSession = connectPgSimple(session);
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  app.use(
    session({
      store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
      name: 'sid',
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      // proxy:true tells express-session to trust X-Forwarded-Proto even independently of
      // Express's own trust-proxy setting — belt-and-suspenders for Vercel serverless where
      // each cold start may not inherit the httpAdapter trust setting in time.
      proxy: isProduction,
      rolling: true, // reset maxAge on every response so active users never get logged out
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.useGlobalInterceptors(new NoStoreInterceptor());
}
