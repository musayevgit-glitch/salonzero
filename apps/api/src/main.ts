import 'reflect-metadata';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
// Load .env from monorepo root; no-op if vars already set (production)
loadDotenv({ path: resolve(__dirname, '../../../.env'), override: false });
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { validateApiEnv } from './config/env';

async function bootstrap() {
  const env = validateApiEnv(process.env);
  const app = await NestFactory.create(AppModule);
  configureApp(app, env);
  await app.listen(env.PORT);
}

bootstrap();
