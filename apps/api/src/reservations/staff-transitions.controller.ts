import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  reservationReasonSchema,
  rescheduleReservationSchema,
  type ReservationReasonInput,
  type RescheduleReservationInput,
} from '@salonomia/validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../auth/types';
import { CurrentSalonContext, type SalonContext } from '../authz/salon-context';
import { Roles } from '../authz/roles.decorator';
import { RolesGuard } from '../authz/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TransitionsService } from './transitions.service';

@Controller('salons/:salonId/reservations/:reservationId')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class StaffTransitionsController {
  constructor(private readonly transitions: TransitionsService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @HttpCode(200)
  @Post('confirm')
  confirm(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transitions.confirm(ctx.salonId, reservationId, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @HttpCode(200)
  @Post('reject')
  reject(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
    @Body(new ZodValidationPipe(reservationReasonSchema)) body: ReservationReasonInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transitions.reject(ctx.salonId, reservationId, user.id, body.reason);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @HttpCode(200)
  @Post('cancel')
  cancel(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
    @Body(new ZodValidationPipe(reservationReasonSchema)) body: ReservationReasonInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transitions.cancelBySalon(ctx.salonId, reservationId, user.id, body.reason);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @HttpCode(200)
  @Post('reschedule')
  reschedule(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
    @Body(new ZodValidationPipe(rescheduleReservationSchema)) body: RescheduleReservationInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transitions.rescheduleBySalon(
      ctx.salonId,
      reservationId,
      user.id,
      new Date(body.startAt),
      body.employeeId,
    );
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @HttpCode(200)
  @Post('check-in')
  checkIn(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transitions.checkIn(ctx.salonId, reservationId, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @HttpCode(200)
  @Post('complete')
  complete(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transitions.complete(ctx.salonId, reservationId, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @HttpCode(200)
  @Post('no-show')
  noShow(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transitions.noShow(ctx.salonId, reservationId, user.id);
  }
}
