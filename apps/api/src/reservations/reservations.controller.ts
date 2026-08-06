import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { createReservationSchema, type CreateReservationInput } from '@salonomia/validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../auth/types';
import { Roles } from '../authz/roles.decorator';
import { RolesGuard } from '../authz/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ReservationsService } from './reservations.service';

// No :salonId in this route — this is customer-facing, not staff-scoped. RolesGuard's
// CUSTOMER-only branch treats any authenticated user as a customer here; salonId is a business
// input in the body, verified against the database inside the service, not an authorization scope
// (docs/security/authorization.md).
@Controller('reservations')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Roles('CUSTOMER')
  @HttpCode(201)
  @Post()
  create(
    @Body(new ZodValidationPipe(createReservationSchema)) body: CreateReservationInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.create(user.id, body);
  }
}
