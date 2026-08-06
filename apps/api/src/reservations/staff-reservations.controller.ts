import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  listSalonReservationsQuerySchema,
  type ListSalonReservationsQuery,
} from '@salonomia/validation';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { CurrentSalonContext, type SalonContext } from '../authz/salon-context';
import { Roles } from '../authz/roles.decorator';
import { RolesGuard } from '../authz/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StaffReservationsService } from './staff-reservations.service';

// Read-only staff views (dashboard today/day/week/detail). SALON_MANAGER included — this is
// exactly the operational surface Section 16 is meant to expose to managers, unlike
// employee/service/salon-settings routes which remain SALON_ADMIN/SUPERADMIN only.
@Controller('salons/:salonId/reservations')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class StaffReservationsController {
  constructor(private readonly reservationsService: StaffReservationsService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @Get()
  list(
    @CurrentSalonContext() ctx: SalonContext,
    @Query(new ZodValidationPipe(listSalonReservationsQuerySchema)) query: ListSalonReservationsQuery,
  ) {
    return this.reservationsService.list(ctx.salonId, query);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @Get('booking-options')
  bookingOptions(@CurrentSalonContext() ctx: SalonContext) {
    return this.reservationsService.getBookingOptions(ctx.salonId);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @Get(':reservationId')
  detail(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
  ) {
    return this.reservationsService.detail(ctx.salonId, reservationId);
  }
}
