import type { INestApplication } from '@nestjs/common';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { Pool } from 'pg';
import { CsrfGuard } from './auth/guards/csrf.guard';
import { csrfCookieMiddleware } from './common/csrf-cookie.middleware';
import type { ApiEnv } from './config/env';

// Shared between main.ts (real server) and integration tests, so tests exercise the exact same
// session/CSRF/CORS wiring production uses rather than a simplified stand-in.
export function configureApp(app: INestApplication, env: ApiEnv): void {
  const isProduction = env.NODE_ENV === 'production';

  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  app.use(cookieParser());

  const PgSession = connectPgSimple(session);
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  app.use(
    session({
      store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(csrfCookieMiddleware);
  app.useGlobalGuards(new CsrfGuard());
}
