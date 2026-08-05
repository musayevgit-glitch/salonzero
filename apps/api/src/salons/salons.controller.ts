import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createSalonSchema,
  listSalonsQuerySchema,
  type CreateSalonInput,
  type ListSalonsQuery,
} from '@salonomia/validation';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { Roles } from '../authz/roles.decorator';
import { RolesGuard } from '../authz/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SalonsService } from './salons.service';

@Controller('salons')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Roles('SUPERADMIN')
  @Get()
  list(@Query(new ZodValidationPipe(listSalonsQuerySchema)) query: ListSalonsQuery) {
    return this.salonsService.list(query);
  }

  @Roles('SUPERADMIN')
  @Get(':salonId')
  detail(@Param('salonId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) salonId: string) {
    return this.salonsService.detail(salonId);
  }

  @Roles('SUPERADMIN')
  @HttpCode(201)
  @Post()
  create(
    @Body(new ZodValidationPipe(createSalonSchema)) body: CreateSalonInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salonsService.create(body, user.id);
  }
}
