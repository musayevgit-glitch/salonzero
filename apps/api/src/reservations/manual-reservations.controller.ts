import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  createManualReservationSchema,
  type CreateManualReservationInput,
} from '@salonomia/validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../auth/types';
import { CurrentSalonContext, type SalonContext } from '../authz/salon-context';
import { Roles } from '../authz/roles.decorator';
import { RolesGuard } from '../authz/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ReservationsService } from './reservations.service';

// Staff-scoped (unlike ReservationsController) — salonId comes from the authorized SalonContext,
// never the body, so a manager can never book into a salon they don't belong to. CUSTOMER is
// deliberately not in @Roles here.
@Controller('salons/:salonId/reservations')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class ManualReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER')
  @HttpCode(201)
  @Post('manual')
  createManual(
    @CurrentSalonContext() ctx: SalonContext,
    @Body(new ZodValidationPipe(createManualReservationSchema)) body: CreateManualReservationInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.createManual(ctx.salonId, user.id, body);
  }
}
