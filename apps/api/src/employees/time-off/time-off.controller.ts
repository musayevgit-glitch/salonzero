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
import { createTimeOffSchema, type CreateTimeOffInput } from '@salonomia/validation';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../../auth/types';
import { CurrentSalonContext, type SalonContext } from '../../authz/salon-context';
import { Roles } from '../../authz/roles.decorator';
import { RolesGuard } from '../../authz/roles.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { TimeOffService } from './time-off.service';

@Controller('salons/:salonId/employees/:employeeId/time-off')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class TimeOffController {
  constructor(private readonly timeOffService: TimeOffService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get()
  list(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
  ) {
    return this.timeOffService.list(ctx.salonId, employeeId);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(201)
  @Post()
  create(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Body(new ZodValidationPipe(createTimeOffSchema)) body: CreateTimeOffInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.timeOffService.create(ctx.salonId, employeeId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(204)
  @Delete(':timeOffId')
  async remove(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Param('timeOffId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) timeOffId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.timeOffService.remove(ctx.salonId, employeeId, timeOffId, user.id);
  }
}
