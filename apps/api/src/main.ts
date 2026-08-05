import 'reflect-metadata';
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
