import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../apps/api/src/app.module';
import { configureApp } from '../../../../apps/api/src/configure-app';
import { validateApiEnv } from '../../../../apps/api/src/config/env';

import type { NextApiRequest, NextApiResponse } from 'next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedExpressApp: any = null;

async function bootstrap() {
  if (!cachedExpressApp) {
    const env = validateApiEnv(process.env);
    const app = await NestFactory.create(AppModule);
    configureApp(app, env);
    await app.init();
    cachedExpressApp = app.getHttpAdapter().getInstance();
  }
  return cachedExpressApp;
}

export const config = {
  api: {
    externalResolver: true,
    bodyParser: false, // Let NestJS handle body parsing
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Next.js catch-all route adds 'catchAll' key to query, which breaks strict Zod validations in NestJS.
  if (req.query) {
    delete req.query.catchAll;
  }
  const expressApp = await bootstrap();
  return expressApp(req, res);
}
