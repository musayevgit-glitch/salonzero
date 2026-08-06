import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createServiceCategorySchema,
  reorderServiceCategoriesSchema,
  updateServiceCategorySchema,
  type CreateServiceCategoryInput,
  type ReorderServiceCategoriesInput,
  type UpdateServiceCategoryInput,
} from '@salonomia/validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../auth/types';
import { CurrentSalonContext, type SalonContext } from '../authz/salon-context';
import { Roles } from '../authz/roles.decorator';
import { RolesGuard } from '../authz/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ServiceCategoriesService } from './service-categories.service';

@Controller('salons/:salonId/service-categories')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class ServiceCategoriesController {
  constructor(private readonly serviceCategoriesService: ServiceCategoriesService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get()
  list(@CurrentSalonContext() ctx: SalonContext) {
    return this.serviceCategoriesService.list(ctx.salonId);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get(':categoryId')
  detail(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('categoryId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) categoryId: string,
  ) {
    return this.serviceCategoriesService.detail(ctx.salonId, categoryId);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(201)
  @Post()
  create(
    @CurrentSalonContext() ctx: SalonContext,
    @Body(new ZodValidationPipe(createServiceCategorySchema)) body: CreateServiceCategoryInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceCategoriesService.create(ctx.salonId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Patch(':categoryId')
  update(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('categoryId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) categoryId: string,
    @Body(new ZodValidationPipe(updateServiceCategorySchema)) body: UpdateServiceCategoryInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceCategoriesService.update(ctx.salonId, categoryId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Post(':categoryId/activate')
  activate(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('categoryId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceCategoriesService.setActive(ctx.salonId, categoryId, true, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Post(':categoryId/deactivate')
  deactivate(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('categoryId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceCategoriesService.setActive(ctx.salonId, categoryId, false, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Post('reorder')
  reorder(
    @CurrentSalonContext() ctx: SalonContext,
    @Body(new ZodValidationPipe(reorderServiceCategoriesSchema))
    body: ReorderServiceCategoriesInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceCategoriesService.reorder(ctx.salonId, body, user.id);
  }
}
