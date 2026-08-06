import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  salonReportQuerySchema,
  auditLogQuerySchema,
  type SalonReportQuery,
  type AuditLogQuery,
} from '@salonomia/validation';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { RolesGuard } from '../authz/roles.guard';
import { Roles } from '../authz/roles.decorator';
import { CurrentSalonContext } from '../authz/salon-context';
import type { SalonContext } from '../authz/salon-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ReportsService } from './reports.service';

// Salon-scoped reports: SALON_ADMIN can see only their own salon.
@Controller('salons/:salonId/reports')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class SalonReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @Roles('SUPERADMIN', 'SALON_ADMIN')
  salonReport(
    @CurrentSalonContext() ctx: SalonContext,
    @Query(new ZodValidationPipe(salonReportQuerySchema)) query: SalonReportQuery,
  ) {
    return this.reports.salonReport(ctx.salonId, query);
  }

  @Get('audit-logs')
  @Roles('SUPERADMIN', 'SALON_ADMIN')
  salonAuditLogs(
    @CurrentSalonContext() ctx: SalonContext,
    @Query(new ZodValidationPipe(auditLogQuerySchema)) query: AuditLogQuery,
  ) {
    return this.reports.auditLogs(ctx.salonId, query);
  }
}

// Platform-level reports: SUPERADMIN only.
@Controller('superadmin/reports')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class SuperadminReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @Roles('SUPERADMIN')
  globalReport(
    @Query(new ZodValidationPipe(salonReportQuerySchema)) query: SalonReportQuery,
  ) {
    return this.reports.globalReport(query);
  }

  @Get('audit-logs')
  @Roles('SUPERADMIN')
  auditLogs(
    @Query(new ZodValidationPipe(auditLogQuerySchema)) query: AuditLogQuery,
  ) {
    return this.reports.auditLogs(null, query);
  }
}
