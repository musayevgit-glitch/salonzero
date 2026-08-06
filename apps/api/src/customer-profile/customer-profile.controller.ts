import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  updateCustomerProfileSchema,
  type UpdateCustomerProfileInput,
} from '@salonomia/validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../auth/types';
import { Roles } from '../authz/roles.decorator';
import { RolesGuard } from '../authz/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CustomerProfileService } from './customer-profile.service';

// No :salonId — personal-account surface available to any authenticated user, same pattern as
// ReservationsController's customer-facing routes. Identity always comes from the session
// (@CurrentUser()), never a client-supplied id — a customer can only ever read/edit their own row.
@Controller('customer/profile')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class CustomerProfileController {
  constructor(private readonly profile: CustomerProfileService) {}

  @Roles('CUSTOMER')
  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.profile.get(user.id);
  }

  @Roles('CUSTOMER')
  @Patch()
  update(
    @Body(new ZodValidationPipe(updateCustomerProfileSchema)) body: UpdateCustomerProfileInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.profile.update(user.id, body);
  }
}
