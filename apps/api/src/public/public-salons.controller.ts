import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  listPublicSalonsQuerySchema,
  publicAvailabilityQuerySchema,
  type ListPublicSalonsQuery,
  type PublicAvailabilityQuery,
} from '@salonomia/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PublicSalonsService } from './public-salons.service';

// Deliberately no guards at all — this is the one genuinely unauthenticated read surface in the
// API (docs/security/data-classification.md "Public" tier only). Every field returned by
// PublicSalonsService is scoped to ACTIVE salons/services/employees and excludes anything
// classified Sensitive PII or Tenant-internal.
@Controller('public/salons')
export class PublicSalonsController {
  constructor(private readonly publicSalons: PublicSalonsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listPublicSalonsQuerySchema)) query: ListPublicSalonsQuery) {
    return this.publicSalons.list(query);
  }

  @Get(':slug/availability-bulk')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  availabilityBulk(
    @Param('slug') slug: string,
    @Query() query: { serviceId: string; employeeId?: string; startDate: string; endDate: string },
  ) {
    if (!query.serviceId || !query.startDate || !query.endDate) {
      throw new BadRequestException('Missing query parameters: serviceId, startDate, and endDate are required.');
    }
    return this.publicSalons.getAvailabilityBulk(slug, query);
  }

  @Get(':slug/availability')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  availability(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(publicAvailabilityQuerySchema)) query: PublicAvailabilityQuery,
  ) {
    return this.publicSalons.getAvailability(slug, query);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.publicSalons.detail(slug);
  }
}
