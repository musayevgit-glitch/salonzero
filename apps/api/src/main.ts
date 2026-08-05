import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateApiEnv } from './config/env';

async function bootstrap() {
  const env = validateApiEnv(process.env);

  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: false }); // tightened with real allowlist in Phase 4/9
  await app.listen(env.PORT);
}

bootstrap();
