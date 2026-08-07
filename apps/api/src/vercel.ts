import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { validateApiEnv } from './config/env';
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

export const handler = async (event: any, context: any, callback: any) => {
  const server = await bootstrap();
  return server(event, context, callback);
};
