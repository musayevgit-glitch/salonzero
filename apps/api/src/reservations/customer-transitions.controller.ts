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
import { Roles } from '../authz/roles.decorator';
import { RolesGuard } from '../authz/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TransitionsService } from './transitions.service';

// No :salonId — customer-facing, ownership checked by customerId (never trusted from the route).
@Controller('reservations/:reservationId')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class CustomerTransitionsController {
  constructor(private readonly transitions: TransitionsService) {}

  @Roles('CUSTOMER')
  @HttpCode(200)
  @Post('cancel')
  cancel(
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
    @Body(new ZodValidationPipe(reservationReasonSchema)) body: ReservationReasonInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transitions.cancelByCustomer(user.id, reservationId, body.reason);
  }

  @Roles('CUSTOMER')
  @HttpCode(200)
  @Post('reschedule')
  reschedule(
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
    @Body(new ZodValidationPipe(rescheduleReservationSchema)) body: RescheduleReservationInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transitions.rescheduleByCustomer(user.id, reservationId, new Date(body.startAt));
  }
}
