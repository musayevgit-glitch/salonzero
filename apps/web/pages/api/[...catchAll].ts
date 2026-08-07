import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../apps/api/src/app.module';
import { configureApp } from '../../../../apps/api/src/configure-app';
import { validateApiEnv } from '../../../../apps/api/src/config/env';
import serverlessExpress from '@codegenie/serverless-express';

import type { NextApiRequest, NextApiResponse } from 'next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedServer: any = null;

async function bootstrap() {
  if (!cachedServer) {
    const env = validateApiEnv(process.env);
    const app = await NestFactory.create(AppModule);
    configureApp(app, env);
    await app.init();
    const expressApp = app.getHttpAdapter().getInstance();
    cachedServer = serverlessExpress({ app: expressApp });
  }
  return cachedServer;
}

export const config = {
  api: {
    externalResolver: true,
    bodyParser: false, // Let NestJS handle body parsing
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const server = await bootstrap();
  return server(req, res, () => {});
}
