import { Controller, Get, Param, Query } from '@nestjs/common';
import { listPublicSalonsQuerySchema, type ListPublicSalonsQuery } from '@salonomia/validation';
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

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.publicSalons.detail(slug);
  }
}
