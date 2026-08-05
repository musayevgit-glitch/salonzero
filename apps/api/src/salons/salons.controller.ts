import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { listSalonsQuerySchema, type ListSalonsQuery } from '@salonomia/validation';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
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
}
