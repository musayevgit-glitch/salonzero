import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  assignEmployeeServiceSchema,
  type AssignEmployeeServiceInput,
} from '@salonomia/validation';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../../auth/types';
import { CurrentSalonContext, type SalonContext } from '../../authz/salon-context';
import { Roles } from '../../authz/roles.decorator';
import { RolesGuard } from '../../authz/roles.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { EmployeeServicesService } from './employee-services.service';

@Controller('salons/:salonId/employees/:employeeId/services')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class EmployeeServicesController {
  constructor(private readonly employeeServicesService: EmployeeServicesService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get()
  list(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
  ) {
    return this.employeeServicesService.list(ctx.salonId, employeeId);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(201)
  @Post()
  assign(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Body(new ZodValidationPipe(assignEmployeeServiceSchema)) body: AssignEmployeeServiceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeeServicesService.assign(ctx.salonId, employeeId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(204)
  @Delete(':serviceId')
  async unassign(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Param('serviceId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) serviceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.employeeServicesService.unassign(ctx.salonId, employeeId, serviceId, user.id);
  }
}
