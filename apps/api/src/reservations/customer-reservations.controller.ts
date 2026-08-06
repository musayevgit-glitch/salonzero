import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  listCustomerReservationsQuerySchema,
  type ListCustomerReservationsQuery,
} from '@salonomia/validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { RolesGuard } from '../authz/roles.guard';
import { Roles } from '../authz/roles.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CustomerReservationsService } from './customer-reservations.service';

@Controller('customer/reservations')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class CustomerReservationsController {
  constructor(private readonly service: CustomerReservationsService) {}

  @Get()
  @Roles('CUSTOMER')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listCustomerReservationsQuerySchema))
    query: ListCustomerReservationsQuery,
  ) {
    return this.service.list(user.id, query);
  }

  @Get(':reservationId')
  @Roles('CUSTOMER')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) reservationId: string,
  ) {
    return this.service.detail(user.id, reservationId);
  }
}
