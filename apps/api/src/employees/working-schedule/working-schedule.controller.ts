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
  createWorkingScheduleSchema,
  type CreateWorkingScheduleInput,
} from '@salonomia/validation';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../../auth/types';
import { CurrentSalonContext, type SalonContext } from '../../authz/salon-context';
import { Roles } from '../../authz/roles.decorator';
import { RolesGuard } from '../../authz/roles.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { WorkingScheduleService } from './working-schedule.service';

@Controller('salons/:salonId/employees/:employeeId/working-schedule')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class WorkingScheduleController {
  constructor(private readonly workingScheduleService: WorkingScheduleService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get()
  list(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
  ) {
    return this.workingScheduleService.list(ctx.salonId, employeeId);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(201)
  @Post()
  create(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Body(new ZodValidationPipe(createWorkingScheduleSchema)) body: CreateWorkingScheduleInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workingScheduleService.create(ctx.salonId, employeeId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(204)
  @Delete(':scheduleId')
  async remove(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Param('scheduleId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) scheduleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.workingScheduleService.remove(ctx.salonId, employeeId, scheduleId, user.id);
  }
}
