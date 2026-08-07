import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/api/src/app.module';
import { configureApp } from '../apps/api/src/configure-app';
import { validateApiEnv } from '../apps/api/src/config/env';
import serverlessExpress from '@codegenie/serverless-express';

let cachedServer: any;

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

export default async (req: any, res: any) => {
  const server = await bootstrap();
  return server(req, res);
};
