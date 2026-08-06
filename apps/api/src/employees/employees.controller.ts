import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createEmployeeSchema,
  listEmployeesQuerySchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type ListEmployeesQuery,
  type UpdateEmployeeInput,
} from '@salonomia/validation';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
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

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(201)
  @Post()
  create(
    @CurrentSalonContext() ctx: SalonContext,
    @Body(new ZodValidationPipe(createEmployeeSchema)) body: CreateEmployeeInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.create(ctx.salonId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Patch(':employeeId')
  update(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Body(new ZodValidationPipe(updateEmployeeSchema)) body: UpdateEmployeeInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.update(ctx.salonId, employeeId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Post(':employeeId/activate')
  activate(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.setActive(ctx.salonId, employeeId, true, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Post(':employeeId/deactivate')
  deactivate(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.setActive(ctx.salonId, employeeId, false, user.id);
  }
}
