import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createServiceSchema,
  listServicesQuerySchema,
  updateServiceSchema,
  type CreateServiceInput,
  type ListServicesQuery,
  type UpdateServiceInput,
} from '@salonomia/validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../auth/types';
import { CurrentSalonContext, type SalonContext } from '../authz/salon-context';
import { Roles } from '../authz/roles.decorator';
import { RolesGuard } from '../authz/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ServicesService } from './services.service';

@Controller('salons/:salonId/services')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get()
  list(
    @CurrentSalonContext() ctx: SalonContext,
    @Query(new ZodValidationPipe(listServicesQuerySchema)) query: ListServicesQuery,
  ) {
    return this.servicesService.list(ctx.salonId, query);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get(':serviceId')
  detail(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('serviceId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) serviceId: string,
  ) {
    return this.servicesService.detail(ctx.salonId, serviceId);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(201)
  @Post()
  create(
    @CurrentSalonContext() ctx: SalonContext,
    @Body(new ZodValidationPipe(createServiceSchema)) body: CreateServiceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.servicesService.create(ctx.salonId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Patch(':serviceId')
  update(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('serviceId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) serviceId: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) body: UpdateServiceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.servicesService.update(ctx.salonId, serviceId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Post(':serviceId/activate')
  activate(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('serviceId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) serviceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.servicesService.setActive(ctx.salonId, serviceId, true, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Post(':serviceId/deactivate')
  deactivate(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('serviceId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) serviceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.servicesService.setActive(ctx.salonId, serviceId, false, user.id);
  }
}
