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
import { createBreakSchema, type CreateBreakInput } from '@salonomia/validation';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../../auth/types';
import { CurrentSalonContext, type SalonContext } from '../../authz/salon-context';
import { Roles } from '../../authz/roles.decorator';
import { RolesGuard } from '../../authz/roles.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { BreaksService } from './breaks.service';

@Controller('salons/:salonId/employees/:employeeId/breaks')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class BreaksController {
  constructor(private readonly breaksService: BreaksService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get()
  list(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
  ) {
    return this.breaksService.list(ctx.salonId, employeeId);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(201)
  @Post()
  create(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Body(new ZodValidationPipe(createBreakSchema)) body: CreateBreakInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.breaksService.create(ctx.salonId, employeeId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(204)
  @Delete(':breakId')
  async remove(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Param('breakId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) breakId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.breaksService.remove(ctx.salonId, employeeId, breakId, user.id);
  }
}
