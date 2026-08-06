import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AuthzModule } from './authz/authz.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SalonsModule } from './salons/salons.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }] }),
    AuthModule,
    AuthzModule,
    SalonsModule,
    EmployeesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
