import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { listEmployeesQuerySchema, type ListEmployeesQuery } from '@salonomia/validation';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { CurrentSalonContext, type SalonContext } from '../authz/salon-context';
import { Roles } from '../authz/roles.decorator';
import { RolesGuard } from '../authz/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EmployeesService } from './employees.service';

@Controller('salons/:salonId/employees')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get()
  list(
    @CurrentSalonContext() ctx: SalonContext,
    @Query(new ZodValidationPipe(listEmployeesQuerySchema)) query: ListEmployeesQuery,
  ) {
    return this.employeesService.list(ctx.salonId, query);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get(':employeeId')
  detail(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
  ) {
    return this.employeesService.detail(ctx.salonId, employeeId);
  }
}
