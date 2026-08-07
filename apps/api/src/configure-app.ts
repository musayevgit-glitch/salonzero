import type { INestApplication } from '@nestjs/common';
import { NoStoreInterceptor } from './common/no-store.interceptor';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { ApiEnv } from './config/env';

export function configureApp(app: INestApplication, env: ApiEnv): void {
  const isProduction = env.NODE_ENV === 'production';

  const httpAdapter = app.getHttpAdapter().getInstance() as import('express').Application;
  if (isProduction || env.TRUST_PROXY_HOPS > 0) {
    httpAdapter.set('trust proxy', env.TRUST_PROXY_HOPS || 1);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: isProduction,
    }),
  );

  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  app.use(cookieParser());

  app.useGlobalInterceptors(new NoStoreInterceptor());
}
